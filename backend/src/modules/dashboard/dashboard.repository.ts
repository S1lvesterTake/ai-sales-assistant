import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  chatMessages,
  chatSessions,
  leads,
  whatsappClickEvents,
} from '../../database/schema';

const DEFAULT_WIDGET_LIMIT = 5;
const MAX_WIDGET_LIMIT = 20;

export interface SummaryRow {
  totalLeads: number;
  newLeads: number;
  totalChatSessions: number;
  whatsappClicks: number;
}

export interface RecentLeadRow {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  createdAt: Date;
}

export interface RecentConversationRow {
  sessionId: string;
  customerName: string | null;
  lastMessage: string;
  lastMessageAt: Date;
}

export interface TopQuestionRow {
  question: string;
  count: number;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly database: DatabaseService) {}

  async getSummary(businessProfileId: string): Promise<SummaryRow> {
    const [totalLeads, newLeads, totalChatSessions, whatsappClicks] =
      await Promise.all([
        this.database.db.$count(
          leads,
          eq(leads.businessProfileId, businessProfileId),
        ),
        this.database.db.$count(
          leads,
          and(
            eq(leads.businessProfileId, businessProfileId),
            eq(leads.status, 'new'),
          ),
        ),
        this.database.db.$count(
          chatSessions,
          eq(chatSessions.businessProfileId, businessProfileId),
        ),
        this.database.db.$count(
          whatsappClickEvents,
          eq(whatsappClickEvents.businessProfileId, businessProfileId),
        ),
      ]);

    return { totalLeads, newLeads, totalChatSessions, whatsappClicks };
  }

  async getRecentLeads(
    businessProfileId: string,
    limit: number = DEFAULT_WIDGET_LIMIT,
  ): Promise<RecentLeadRow[]> {
    const clamped = Math.min(limit, MAX_WIDGET_LIMIT);

    return this.database.db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.businessProfileId, businessProfileId))
      .orderBy(desc(leads.createdAt), desc(leads.id))
      .limit(clamped);
  }

  async getRecentConversations(
    businessProfileId: string,
    limit: number = DEFAULT_WIDGET_LIMIT,
  ): Promise<RecentConversationRow[]> {
    const clamped = Math.min(limit, MAX_WIDGET_LIMIT);

    // Get sessions with their latest customer message
    const sessions = await this.database.db
      .select({
        id: chatSessions.id,
        customerName: chatSessions.customerName,
        createdAt: chatSessions.createdAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.businessProfileId, businessProfileId))
      .orderBy(desc(chatSessions.createdAt), desc(chatSessions.id))
      .limit(clamped);

    const results: RecentConversationRow[] = [];

    for (const session of sessions) {
      const [lastMsg] = await this.database.db
        .select({
          message: chatMessages.message,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chatSessionId, session.id),
            eq(chatMessages.role, 'customer'),
          ),
        )
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(1);

      results.push({
        sessionId: session.id,
        customerName: session.customerName,
        lastMessage: lastMsg?.message ?? '',
        lastMessageAt: lastMsg?.createdAt ?? session.createdAt ?? new Date(),
      });
    }

    return results;
  }

  async getTopQuestions(
    businessProfileId: string,
    limit: number = DEFAULT_WIDGET_LIMIT,
  ): Promise<TopQuestionRow[]> {
    const clamped = Math.min(limit, MAX_WIDGET_LIMIT);

    const rows = await this.database.db
      .select({
        question: chatMessages.message,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.chatSessionId, chatSessions.id))
      .where(
        and(
          eq(chatSessions.businessProfileId, businessProfileId),
          eq(chatMessages.role, 'customer'),
        ),
      )
      .groupBy(chatMessages.message)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(clamped);

    return rows.map((row) => ({
      question: row.question,
      count: Number(row.count),
    }));
  }
}
