import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const errorLogs = pgTable('error_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: varchar('source', { length: 100 }),
  message: text('message').notNull(),
  stack: text('stack'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
