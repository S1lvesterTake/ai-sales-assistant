import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businessProfiles } from './business-profiles.schema';
import { chatSessions } from './chat-sessions.schema';

export const leadStatus = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'closed',
  'lost',
]);

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessProfileId: uuid('business_profile_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    chatSessionId: uuid('chat_session_id').references(() => chatSessions.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 100 }),
    phone: varchar('phone', { length: 30 }).notNull(),
    interestSummary: text('interest_summary'),
    status: leadStatus('status').notNull().default('new'),
    source: varchar('source', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('leads_business_phone_unique').on(
      table.businessProfileId,
      table.phone,
    ),
    index('leads_business_status_created_id_idx').on(
      table.businessProfileId,
      table.status,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('leads_business_created_id_idx').on(
      table.businessProfileId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check('leads_phone_format_check', sql`${table.phone} ~ '^62[0-9]{8,13}$'`),
  ],
);
