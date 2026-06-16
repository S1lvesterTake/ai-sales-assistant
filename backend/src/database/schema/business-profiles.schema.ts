import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const businessProfiles = pgTable(
  'business_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 100 }).notNull(),
    businessName: varchar('business_name', { length: 150 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    whatsappNumber: varchar('whatsapp_number', { length: 30 }).notNull(),
    location: text('location'),
    operatingHours: varchar('operating_hours', { length: 255 }),
    mainOffer: text('main_offer'),
    ctaMessage: text('cta_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('business_profiles_user_id_unique').on(table.userId),
    uniqueIndex('business_profiles_slug_unique').on(table.slug),
    check(
      'business_profiles_slug_format_check',
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      'business_profiles_whatsapp_format_check',
      sql`${table.whatsappNumber} ~ '^62[0-9]{8,13}$'`,
    ),
  ],
);
