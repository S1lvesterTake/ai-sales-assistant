import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import {
  InvalidIndonesianPhoneError,
  normalizeIndonesianPhone,
} from '../../common/utils/indonesian-phone';
import {
  resolveBusinessBySlug,
  resolveBusinessWithWhatsappBySlug,
} from '../../common/utils/slug';
import { ChatSessionAuthService } from './chat-session-auth.service';
import { ChatProcessingService } from './chat-processing.service';
import {
  ChatMessageRecord,
  ChatSessionsRepository,
} from './chat-sessions.repository';
import { generateSessionToken } from './session-token.utils';
import type { CreateChatSessionDto } from './dto/create-chat-session.dto';
import type { ChatHistoryQueryDto } from './dto/chat-history-query.dto';
import { SendMessageInput } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatSessionsRepository,
    private readonly auth: ChatSessionAuthService,
    private readonly processing: ChatProcessingService,
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async createSession(businessSlug: string, input: CreateChatSessionDto) {
    const profile = await resolveBusinessBySlug(this.database, businessSlug);
    const { raw, hash } = generateSessionToken();
    const ttl = this.config.getOrThrow<number>('CHAT_SESSION_TTL');
    const expiresAt = new Date(Date.now() + ttl * 1_000);

    const session = await this.repository.create({
      businessProfileId: profile.id,
      accessTokenHash: hash,
      expiresAt,
      customerName: input.customerName ?? null,
      customerPhone: this.normalizeOptionalPhone(input.customerPhone),
      source: input.source ?? null,
    });

    return {
      sessionId: session.id,
      sessionToken: raw,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async sendMessage(
    businessSlug: string,
    sessionId: string,
    rawToken: string,
    input: SendMessageInput,
  ) {
    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'Token sesi diperlukan',
        code: 'MISSING_CHAT_SESSION_TOKEN',
      });
    }

    const profile = await resolveBusinessWithWhatsappBySlug(
      this.database,
      businessSlug,
    );

    await this.auth.authorize(sessionId, profile.id, rawToken);

    const reply = await this.processing.processMessage(
      sessionId,
      profile.id,
      profile.whatsappNumber,
      input,
    );

    return {
      success: true as const,
      data: reply,
    };
  }

  async getHistory(
    businessSlug: string,
    sessionId: string,
    rawToken: string,
    query: ChatHistoryQueryDto,
  ) {
    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'Token sesi diperlukan',
        code: 'MISSING_CHAT_SESSION_TOKEN',
      });
    }

    const profile = await resolveBusinessBySlug(this.database, businessSlug);

    await this.auth.authorize(sessionId, profile.id, rawToken);

    const result = await this.repository.findMessagesBySession(
      sessionId,
      profile.id,
      query.page,
      query.limit,
    );

    return {
      success: true as const,
      data: result.items.map((msg) => this.toMessageResponse(msg)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  private normalizeOptionalPhone(
    value: string | null | undefined,
  ): string | null {
    if (!value || !value.trim()) return null;
    try {
      return normalizeIndonesianPhone(value);
    } catch (error) {
      if (!(error instanceof InvalidIndonesianPhoneError)) throw error;
      throw new UnprocessableEntityException({
        message: 'Nomor WhatsApp tidak valid',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            field: 'customerPhone',
            message: 'Gunakan format 08, 628, atau +628 yang valid',
          },
        ],
      });
    }
  }

  private toMessageResponse(msg: ChatMessageRecord) {
    return {
      id: msg.id,
      role: msg.role,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
      clientMessageId: msg.clientMessageId,
      replyToMessageId: msg.replyToMessageId,
      processingStatus: msg.processingStatus,
    };
  }
}
