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
  conversionRate: number;
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
    const [
      totalLeads,
      newLeads,
      contactedLeads,
      totalChatSessions,
      whatsappClicks,
    ] = await Promise.all([
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
        leads,
        and(
          eq(leads.businessProfileId, businessProfileId),
          eq(leads.status, 'contacted'),
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

    const conversionRate =
      totalLeads > 0
        ? Math.round((contactedLeads / totalLeads) * 1000) / 10
        : 0;

    return {
      totalLeads,
      newLeads,
      conversionRate,
      totalChatSessions,
      whatsappClicks,
    };
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

    // Single query: LEFT JOIN sessions with customer messages, ROW_NUMBER picks
    // the latest message per session so sessions with no messages also appear.
    const ranked = this.database.db
      .select({
        sessionId: chatSessions.id,
        customerName: chatSessions.customerName,
        sessionCreatedAt: chatSessions.createdAt,
        lastMessage: chatMessages.message,
        lastMessageAt: chatMessages.createdAt,
        rn: sql<number>`ROW_NUMBER() OVER (
          PARTITION BY ${chatSessions.id}
          ORDER BY ${chatMessages.createdAt} DESC NULLS LAST,
                   ${chatMessages.id} DESC NULLS LAST
        )`.as('rn'),
      })
      .from(chatSessions)
      .leftJoin(
        chatMessages,
        and(
          eq(chatMessages.chatSessionId, chatSessions.id),
          eq(chatMessages.role, 'customer'),
        ),
      )
      .where(eq(chatSessions.businessProfileId, businessProfileId))
      .as('ranked');

    const rows = await this.database.db
      .select({
        sessionId: ranked.sessionId,
        customerName: ranked.customerName,
        sessionCreatedAt: ranked.sessionCreatedAt,
        lastMessage: ranked.lastMessage,
        lastMessageAt: ranked.lastMessageAt,
      })
      .from(ranked)
      .where(eq(ranked.rn, 1))
      .orderBy(desc(ranked.sessionCreatedAt), desc(ranked.sessionId))
      .limit(clamped);

    return rows.map((row) => ({
      sessionId: row.sessionId,
      customerName: row.customerName,
      lastMessage: row.lastMessage ?? '',
      lastMessageAt: row.lastMessageAt ?? row.sessionCreatedAt,
    }));
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
