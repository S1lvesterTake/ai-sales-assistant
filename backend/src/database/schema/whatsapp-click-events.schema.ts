import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businessProfiles } from './business-profiles.schema';
import { chatSessions } from './chat-sessions.schema';
import { leads } from './leads.schema';

export const whatsappClickEvents = pgTable(
  'whatsapp_click_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessProfileId: uuid('business_profile_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    chatSessionId: uuid('chat_session_id').references(() => chatSessions.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => leads.id, {
      onDelete: 'set null',
    }),
    clickedAt: timestamp('clicked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('whatsapp_events_business_clicked_id_idx').on(
      table.businessProfileId,
      table.clickedAt.desc(),
      table.id.desc(),
    ),
  ],
);
