import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { whatsappClickEvents } from '../../database/schema';

export type WhatsappClickRecord = typeof whatsappClickEvents.$inferSelect;

export type CreateClickRecord = Pick<
  WhatsappClickRecord,
  'businessProfileId' | 'chatSessionId' | 'leadId'
>;

@Injectable()
export class WhatsappRepository {
  constructor(private readonly database: DatabaseService) {}

  async createClick(input: CreateClickRecord): Promise<WhatsappClickRecord> {
    const [event] = await this.database.db
      .insert(whatsappClickEvents)
      .values(input)
      .returning();
    if (!event) throw new Error('WhatsApp click insert returned no row');
    return event;
  }
}
