import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { isUniqueViolation } from '../../database/postgres-error';
import { chatMessages } from '../../database/schema';
import { AI_PROVIDER } from '../ai/ai-provider.interface';
import type { AiProvider } from '../ai/ai-provider.interface';
import { BuyingIntentService } from './buying-intent.service';
import { PromptBuilderService } from './prompt-builder.service';
import { SendMessageInput } from './dto/send-message.dto';
import type { ChatReplyResponse } from './dto/chat-reply-response.dto';

export const FALLBACK_RESPONSE =
  'Maaf Kak, saya belum punya informasi yang cukup untuk menjawab itu. Kakak bisa langsung menghubungi owner melalui WhatsApp agar mendapatkan jawaban yang lebih tepat.';

const MAX_FAILED_RETRIES = 3;

type ProcessRow = {
  id: string;
  chatSessionId: string;
  clientMessageId: string | null;
  processingStatus: string | null;
  processingStartedAt: Date | null;
};

type InsertOrClaimResult =
  | { outcome: 'completed'; reply: ChatReplyResponse }
  | { outcome: 'pending' }
  | { outcome: 'process'; row: ProcessRow };

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
      return {
        clientMessageId: input.clientMessageId,
        processingStatus: 'pending',
      };
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
      const aiResult = await this.callAiWithRetry({
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
          shouldShowWhatsappCta: intent.shouldShowWhatsappCta,
          isBuyingIntentDetected: intent.isBuyingIntentDetected,
          whatsappUrl,
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
  ): Promise<InsertOrClaimResult> {
    // Check for existing message first
    const existing = await this.findExisting(sessionId, clientMessageId);
    if (existing) {
      return this.handleExisting(sessionId, message, existing);
    }

    const now = new Date();
    const customerMessageId = randomUUID();

    let inserted: ProcessRow | undefined;

    try {
      [inserted] = await this.database.db
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
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.findExisting(sessionId, clientMessageId);
      if (raced) {
        return this.handleExisting(sessionId, message, raced);
      }
      throw error;
    }

    if (!inserted) {
      // Race: re-read and handle
      const raced = await this.findExisting(sessionId, clientMessageId);
      if (raced) {
        return this.handleExisting(sessionId, message, raced);
      }
      throw new Error('Customer message insert returned no row');
    }

    return this.toProcessOutcome(inserted);
  }

  private async callAiWithRetry(
    input: Parameters<AiProvider['generateResponse']>[0],
  ) {
    const timeoutMs = this.config.get<number>('AI_TIMEOUT_MS') ?? 8_000;
    const startTime = Date.now();
    try {
      return await this.aiProvider.generateResponse(input);
    } catch (err) {
      if (Date.now() - startTime >= timeoutMs) throw err;
      const jitter = Math.floor(Math.random() * 1_000) + 1_500;
      await new Promise((resolve) => setTimeout(resolve, jitter));
      return this.aiProvider.generateResponse(input);
    }
  }

  private async findExisting(sessionId: string, clientMessageId: string) {
    const [existing] = await this.database.db
      .select({
        id: chatMessages.id,
        processingStatus: chatMessages.processingStatus,
        processingStartedAt: chatMessages.processingStartedAt,
        message: chatMessages.message,
        clientMessageId: chatMessages.clientMessageId,
        retryCount: chatMessages.retryCount,
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
    message: string,
    existing: {
      id: string;
      processingStatus: string | null;
      processingStartedAt: Date | null;
      clientMessageId: string | null;
      retryCount: number;
    },
  ): Promise<InsertOrClaimResult> {
    if (existing.processingStatus === 'completed') {
      return this.handleCompleted(
        sessionId,
        existing.clientMessageId ?? '',
        existing,
      );
    }
    if (existing.processingStatus === 'pending') {
      return this.handlePending(sessionId, message, existing);
    }
    if (existing.processingStatus === 'failed') {
      return this.handleFailed(sessionId, message, existing);
    }
    return { outcome: 'pending' };
  }

  private async handleCompleted(
    sessionId: string,
    clientMessageId: string,
    existing: { id: string },
  ): Promise<{ outcome: 'completed'; reply: ChatReplyResponse }> {
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
        shouldShowWhatsappCta:
          typeof meta.shouldShowWhatsappCta === 'boolean'
            ? meta.shouldShowWhatsappCta
            : Boolean(meta.isBuyingIntent),
        isBuyingIntentDetected:
          typeof meta.isBuyingIntentDetected === 'boolean'
            ? meta.isBuyingIntentDetected
            : Boolean(meta.isBuyingIntent),
        shouldCaptureLead: Boolean(meta.shouldCaptureLead),
        whatsappUrl:
          typeof meta.whatsappUrl === 'string' ? meta.whatsappUrl : null,
        detectedProduct:
          typeof meta.detectedProduct === 'string'
            ? meta.detectedProduct
            : null,
      },
    };
  }

  private async handlePending(
    sessionId: string,
    message: string,
    existing: { id: string; processingStartedAt: Date | null },
  ): Promise<{ outcome: 'pending' } | { outcome: 'process'; row: ProcessRow }> {
    const staleMs = this.config.get<number>('CHAT_STALE_CLAIM_MS') ?? 30_000;
    if (
      !existing.processingStartedAt ||
      Date.now() - existing.processingStartedAt.getTime() <= staleMs
    ) {
      return { outcome: 'pending' };
    }

    const [reclaimed] = await this.database.db
      .update(chatMessages)
      .set({ processingStartedAt: new Date(), message })
      .where(
        and(
          eq(chatMessages.id, existing.id),
          eq(chatMessages.chatSessionId, sessionId),
          eq(chatMessages.processingStatus, 'pending'),
        ),
      )
      .returning();

    if (reclaimed) {
      return this.toProcessOutcome(reclaimed);
    }
    // Someone else reclaimed it first
    return { outcome: 'pending' };
  }

  private async handleFailed(
    sessionId: string,
    message: string,
    existing: {
      id: string;
      retryCount: number;
      clientMessageId: string | null;
    },
  ): Promise<InsertOrClaimResult> {
    if (existing.retryCount >= MAX_FAILED_RETRIES) {
      // Dead-letter: stop cycling, mark completed, return fallback
      await this.database.db
        .update(chatMessages)
        .set({ processingStatus: 'completed' })
        .where(
          and(
            eq(chatMessages.id, existing.id),
            eq(chatMessages.chatSessionId, sessionId),
          ),
        );
      return {
        outcome: 'completed',
        reply: {
          clientMessageId: existing.clientMessageId ?? '',
          processingStatus: 'completed',
          message: FALLBACK_RESPONSE,
          shouldShowWhatsappCta: false,
          isBuyingIntentDetected: false,
          shouldCaptureLead: false,
          whatsappUrl: null,
          detectedProduct: null,
        },
      };
    }

    const [reclaimed] = await this.database.db
      .update(chatMessages)
      .set({
        processingStatus: 'pending',
        processingStartedAt: new Date(),
        message,
        retryCount: existing.retryCount + 1,
      })
      .where(
        and(
          eq(chatMessages.id, existing.id),
          eq(chatMessages.chatSessionId, sessionId),
          eq(chatMessages.processingStatus, 'failed'),
        ),
      )
      .returning();

    if (!reclaimed) return { outcome: 'pending' };
    return this.toProcessOutcome(reclaimed);
  }

  private toProcessOutcome(row: ProcessRow): {
    outcome: 'process';
    row: ProcessRow;
  } {
    return {
      outcome: 'process',
      row: {
        id: row.id,
        chatSessionId: row.chatSessionId,
        clientMessageId: row.clientMessageId,
        processingStatus: row.processingStatus,
        processingStartedAt: row.processingStartedAt,
      },
    };
  }
}
