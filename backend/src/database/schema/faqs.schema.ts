import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businessProfiles } from './business-profiles.schema';

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessProfileId: uuid('business_profile_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: varchar('category', { length: 100 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('faqs_business_active_created_id_idx').on(
      table.businessProfileId,
      table.isActive,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
