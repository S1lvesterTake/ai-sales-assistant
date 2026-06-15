import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businessProfiles } from './business-profiles.schema';

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessProfileId: uuid('business_profile_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    accessTokenHash: text('access_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    customerName: varchar('customer_name', { length: 100 }),
    customerPhone: varchar('customer_phone', { length: 30 }),
    source: varchar('source', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'chat_sessions_customer_phone_format_check',
      sql`${table.customerPhone} IS NULL OR ${table.customerPhone} ~ '^62[0-9]{8,13}$'`,
    ),
    uniqueIndex('chat_sessions_id_business_unique').on(
      table.id,
      table.businessProfileId,
    ),
    index('chat_sessions_business_created_id_idx').on(
      table.businessProfileId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
