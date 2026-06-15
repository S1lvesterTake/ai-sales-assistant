import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { chatMessages, chatSessions } from '../../database/schema';

export type ChatSessionRecord = typeof chatSessions.$inferSelect;
export type ChatMessageRecord = typeof chatMessages.$inferSelect;

export type CreateSessionRecord = Pick<
  ChatSessionRecord,
  | 'businessProfileId'
  | 'accessTokenHash'
  | 'expiresAt'
  | 'customerName'
  | 'customerPhone'
  | 'source'
>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface PaginatedMessages {
  items: ChatMessageRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ChatSessionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateSessionRecord): Promise<ChatSessionRecord> {
    const [session] = await this.database.db
      .insert(chatSessions)
      .values(input)
      .returning();
    if (!session) throw new Error('Chat session insert returned no row');
    return session;
  }

  async findByIdAndBusiness(
    sessionId: string,
    businessProfileId: string,
  ): Promise<ChatSessionRecord | null> {
    const [session] = await this.database.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.businessProfileId, businessProfileId),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async findMessagesBySession(
    sessionId: string,
    businessProfileId: string,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedMessages> {
    const offset = (page - 1) * limit;

    const where = and(eq(chatMessages.chatSessionId, sessionId));

    const [items, totalRows] = await Promise.all([
      this.database.db
        .select()
        .from(chatMessages)
        .where(where)
        .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id))
        .limit(limit)
        .offset(offset),
      this.database.db.$count(chatMessages, where),
    ]);

    return {
      items,
      total: totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit),
    };
  }
}
