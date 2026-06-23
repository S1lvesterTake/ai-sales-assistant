import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../../database/schema';

// Build a Drizzle instance for query-building only — no real DB connection needed.
// Pool is lazy: it never connects until a query is executed. .toSQL() only
// serialises the query to a string, so no network call is ever made here.
const db = drizzle(new Pool(), { schema });
const { chatSessions, chatMessages } = schema;

describe('DashboardRepository – SQL generation', () => {
  describe('getRecentConversations inner subquery', () => {
    it('emits distinct SQL aliases for both created_at columns so the outer query is unambiguous', () => {
      const builder = db
        .select({
          sessionId: chatSessions.id,
          customerName: chatSessions.customerName,
          sessionCreatedAt: sql<Date>`${chatSessions.createdAt}`.as(
            'session_created_at',
          ),
          lastMessage: chatMessages.message,
          lastMessageAt: sql<Date>`${chatMessages.createdAt}`.as(
            'last_message_at',
          ),
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
        .where(eq(chatSessions.businessProfileId, 'test-id'));

      const { sql: generatedSql } = builder.toSQL();

      expect(generatedSql).toContain('"session_created_at"');
      expect(generatedSql).toContain('"last_message_at"');
    });
  });
});
