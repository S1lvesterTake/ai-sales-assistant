import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { chatSessions } from './chat-sessions.schema';

export const chatMessageRole = pgEnum('chat_message_role', [
  'customer',
  'assistant',
  'system',
]);

export const chatProcessingStatus = pgEnum('chat_processing_status', [
  'pending',
  'completed',
  'failed',
]);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chatSessionId: uuid('chat_session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    clientMessageId: uuid('client_message_id'),
    replyToMessageId: uuid('reply_to_message_id'),
    processingStatus: chatProcessingStatus('processing_status'),
    processingStartedAt: timestamp('processing_started_at', {
      withTimezone: true,
    }),
    role: chatMessageRole('role').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('chat_messages_session_client_message_unique').on(
      table.chatSessionId,
      table.clientMessageId,
    ),
    uniqueIndex('chat_messages_reply_to_unique')
      .on(table.replyToMessageId)
      .where(sql`${table.replyToMessageId} is not null`),
    unique('chat_messages_id_session_unique').on(table.id, table.chatSessionId),
    index('chat_messages_session_created_id_idx').on(
      table.chatSessionId,
      table.createdAt,
      table.id,
    ),
    foreignKey({
      columns: [table.replyToMessageId, table.chatSessionId],
      foreignColumns: [table.id, table.chatSessionId],
      name: 'chat_messages_reply_same_session_fk',
    }).onDelete('cascade'),
    check(
      'chat_messages_customer_fields_check',
      sql`${table.role} <> 'customer' OR (${table.clientMessageId} IS NOT NULL AND ${table.processingStatus} IS NOT NULL AND ${table.replyToMessageId} IS NULL)`,
    ),
    check(
      'chat_messages_assistant_reply_check',
      sql`${table.role} <> 'assistant' OR (${table.replyToMessageId} IS NOT NULL AND ${table.clientMessageId} IS NULL AND ${table.processingStatus} IS NULL)`,
    ),
  ],
);
