import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businessProfiles } from './business-profiles.schema';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessProfileId: uuid('business_profile_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    category: varchar('category', { length: 100 }),
    isAvailable: boolean('is_available').notNull().default(true),
    orderingInstruction: text('ordering_instruction'),
    additionalNotes: text('additional_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('products_price_nonnegative_check', sql`${table.price} >= 0`),
    index('products_business_available_created_id_idx').on(
      table.businessProfileId,
      table.isAvailable,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('products_business_category_created_id_idx').on(
      table.businessProfileId,
      table.category,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
