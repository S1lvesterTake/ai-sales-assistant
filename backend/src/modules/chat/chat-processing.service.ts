import { randomUUID } from 'node:crypto';
import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { chatMessages } from '../../database/schema';
import { AI_PROVIDER } from '../ai/ai-provider.interface';
import type { AiProvider } from '../ai/ai-provider.interface';
import { BuyingIntentService } from './buying-intent.service';
import { PromptBuilderService } from './prompt-builder.service';
import { SendMessageInput } from './dto/send-message.dto';
import type { ChatReplyResponse } from './dto/chat-reply-response.dto';

export const FALLBACK_RESPONSE =
  'Maaf Kak, saya belum punya informasi yang cukup untuk menjawab itu. Kakak bisa langsung menghubungi owner melalui WhatsApp agar mendapatkan jawaban yang lebih tepat.';

@Injectable()
export class ChatProcessingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly buyingIntent: BuyingIntentService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async processMessage(
    sessionId: string,
    businessProfileId: string,
    businessWhatsapp: string,
    input: SendMessageInput,
  ): Promise<ChatReplyResponse> {
    // Step 1: Insert or claim the customer message
    const claimResult = await this.insertOrClaim(
      sessionId,
      input.clientMessageId,
      input.message,
    );

    if (claimResult.outcome === 'completed') {
      return claimResult.reply;
    }

    if (claimResult.outcome === 'pending') {
      throw new HttpException(
        {
          success: true,
          message: 'Pesan sedang diproses',
          data: {
            clientMessageId: input.clientMessageId,
            processingStatus: 'pending',
          },
        } satisfies Record<string, unknown>,
        HttpStatus.ACCEPTED,
      );
    }

    const customerMessageRow = claimResult.row;

    // Step 2: Build AI prompt context (no transaction)
    const promptContext = await this.promptBuilder.buildContext(
      businessProfileId,
      input.message,
    );

    // Step 3: Call AI provider (no transaction!)
    let aiResponseMessage: string;
    try {
      const aiResult = await this.aiProvider.generateResponse({
        systemPrompt: promptContext.systemPrompt,
        context: promptContext.context,
        userMessage: input.message,
      });
      aiResponseMessage = aiResult.message;
    } catch {
      aiResponseMessage = FALLBACK_RESPONSE;
    }

    // Step 4: Detect buying intent
    const intent = this.buyingIntent.detect(input.message, aiResponseMessage);

    // Step 5: Persist assistant response + update status in one transaction
    const assistantMessageId = randomUUID();
    const whatsappUrl =
      intent.shouldShowWhatsappCta && businessWhatsapp
        ? `https://wa.me/${businessWhatsapp}`
        : null;

    await this.database.db.transaction(async (tx) => {
      // Insert assistant response
      await tx.insert(chatMessages).values({
        id: assistantMessageId,
        chatSessionId: sessionId,
        replyToMessageId: customerMessageRow.id,
        role: 'assistant',
        message: aiResponseMessage,
        metadata: {
          isBuyingIntent: intent.isBuyingIntentDetected,
          shouldCaptureLead: intent.shouldCaptureLead,
          detectedProduct: intent.detectedProduct,
        },
      });

      // Update customer message to completed
      await tx
        .update(chatMessages)
        .set({ processingStatus: 'completed' })
        .where(
          and(
            eq(chatMessages.id, customerMessageRow.id),
            eq(chatMessages.chatSessionId, sessionId),
          ),
        );
    });

    return {
      clientMessageId: input.clientMessageId,
      processingStatus: 'completed',
      message: aiResponseMessage,
      shouldShowWhatsappCta: intent.shouldShowWhatsappCta,
      isBuyingIntentDetected: intent.isBuyingIntentDetected,
      shouldCaptureLead: intent.shouldCaptureLead,
      whatsappUrl,
      detectedProduct: intent.detectedProduct,
    };
  }

  private async insertOrClaim(
    sessionId: string,
    clientMessageId: string,
    message: string,
  ): Promise<
    | { outcome: 'completed'; reply: ChatReplyResponse }
    | { outcome: 'pending' }
    | {
        outcome: 'process';
        row: {
          id: string;
          chatSessionId: string;
          clientMessageId: string | null;
          processingStatus: string | null;
          processingStartedAt: Date | null;
        };
      }
  > {
    // Check for existing message first
    const existing = await this.findExisting(sessionId, clientMessageId);
    if (existing) {
      return this.handleExisting(sessionId, clientMessageId, message, existing);
    }

    const now = new Date();
    const customerMessageId = randomUUID();

    // Try to insert
    const [inserted] = await this.database.db
      .insert(chatMessages)
      .values({
        id: customerMessageId,
        chatSessionId: sessionId,
        clientMessageId,
        role: 'customer',
        message,
        processingStatus: 'pending',
        processingStartedAt: now,
      })
      .returning();

    if (!inserted) {
      // Race: re-read and handle
      const raced = await this.findExisting(sessionId, clientMessageId);
      if (raced) {
        return this.handleExisting(sessionId, clientMessageId, message, raced);
      }
      throw new Error('Customer message insert returned no row');
    }

    return {
      outcome: 'process',
      row: {
        id: inserted.id,
        chatSessionId: inserted.chatSessionId,
        clientMessageId: inserted.clientMessageId,
        processingStatus: inserted.processingStatus,
        processingStartedAt: inserted.processingStartedAt,
      },
    };
  }

  private async findExisting(sessionId: string, clientMessageId: string) {
    const [existing] = await this.database.db
      .select({
        id: chatMessages.id,
        processingStatus: chatMessages.processingStatus,
        processingStartedAt: chatMessages.processingStartedAt,
        message: chatMessages.message,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatSessionId, sessionId),
          eq(chatMessages.clientMessageId, clientMessageId),
        ),
      )
      .limit(1);
    return existing ?? null;
  }

  private async handleExisting(
    sessionId: string,
    clientMessageId: string,
    message: string,
    existing: {
      id: string;
      processingStatus: string | null;
      processingStartedAt: Date | null;
    },
  ): Promise<
    | { outcome: 'completed'; reply: ChatReplyResponse }
    | { outcome: 'pending' }
    | {
        outcome: 'process';
        row: {
          id: string;
          chatSessionId: string;
          clientMessageId: string | null;
          processingStatus: string | null;
          processingStartedAt: Date | null;
        };
      }
  > {
    if (existing.processingStatus === 'completed') {
      // Return stored assistant response
      const [assistant] = await this.database.db
        .select({
          message: chatMessages.message,
          metadata: chatMessages.metadata,
        })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chatSessionId, sessionId),
            eq(chatMessages.replyToMessageId, existing.id),
          ),
        )
        .limit(1);

      const meta = (assistant?.metadata ?? {}) as Record<string, unknown>;

      return {
        outcome: 'completed',
        reply: {
          clientMessageId,
          processingStatus: 'completed',
          message: assistant?.message ?? FALLBACK_RESPONSE,
          shouldShowWhatsappCta: Boolean(meta.isBuyingIntent),
          isBuyingIntentDetected: Boolean(meta.isBuyingIntent),
          shouldCaptureLead: Boolean(meta.shouldCaptureLead),
          whatsappUrl: null,
          detectedProduct: (meta.detectedProduct as string) ?? null,
        },
      };
    }

    if (existing.processingStatus === 'pending') {
      // Check for stale claim
      const staleMs = this.config.get<number>('CHAT_STALE_CLAIM_MS') ?? 30_000;

      if (
        existing.processingStartedAt &&
        Date.now() - existing.processingStartedAt.getTime() > staleMs
      ) {
        // Reclaim stale message
        const [reclaimed] = await this.database.db
          .update(chatMessages)
          .set({
            processingStartedAt: new Date(),
            message,
          })
          .where(
            and(
              eq(chatMessages.id, existing.id),
              eq(chatMessages.chatSessionId, sessionId),
              eq(chatMessages.processingStatus, 'pending'),
            ),
          )
          .returning();

        if (reclaimed) {
          return {
            outcome: 'process',
            row: {
              id: reclaimed.id,
              chatSessionId: reclaimed.chatSessionId,
              clientMessageId: reclaimed.clientMessageId,
              processingStatus: reclaimed.processingStatus,
              processingStartedAt: reclaimed.processingStartedAt,
            },
          };
        }
        // If reclamation failed, someone else got it — return pending
      }

      return { outcome: 'pending' };
    }

    if (existing.processingStatus === 'failed') {
      // Reclaim failed message
      const [reclaimed] = await this.database.db
        .update(chatMessages)
        .set({
          processingStatus: 'pending',
          processingStartedAt: new Date(),
          message,
        })
        .where(
          and(
            eq(chatMessages.id, existing.id),
            eq(chatMessages.chatSessionId, sessionId),
          ),
        )
        .returning();

      if (reclaimed) {
        return {
          outcome: 'process',
          row: {
            id: reclaimed.id,
            chatSessionId: reclaimed.chatSessionId,
            clientMessageId: reclaimed.clientMessageId,
            processingStatus: reclaimed.processingStatus,
            processingStartedAt: reclaimed.processingStartedAt,
          },
        };
      }

      throw new Error('Failed to reclaim failed message');
    }

    return { outcome: 'pending' };
  }
}
