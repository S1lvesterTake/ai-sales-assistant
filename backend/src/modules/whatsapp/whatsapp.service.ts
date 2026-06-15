import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { businessProfiles } from '../../database/schema';
import { ChatSessionAuthService } from '../chat/chat-session-auth.service';
import { WhatsappRepository } from './whatsapp.repository';

const PREFILLED_MESSAGE =
  'Halo Kak, saya lihat katalog produk dan tertarik untuk order. Bisa dibantu?';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly repository: WhatsappRepository,
    private readonly chatAuth: ChatSessionAuthService,
    private readonly database: DatabaseService,
  ) {}

  async generateLink(
    businessSlug: string,
    sessionId?: string,
    leadId?: string,
    rawToken?: string,
  ): Promise<{ url: string }> {
    const profile = await this.resolveBusiness(businessSlug);

    // If session context is provided, verify authorization
    if (sessionId) {
      if (!rawToken) {
        throw new UnauthorizedException({
          message: 'Token sesi diperlukan untuk konteks ini',
          code: 'MISSING_CHAT_SESSION_TOKEN',
        });
      }
      await this.chatAuth.authorize(sessionId, profile.id, rawToken);
    }

    const message = encodeURIComponent(PREFILLED_MESSAGE);
    const url = `https://wa.me/${profile.whatsappNumber}?text=${message}`;

    return { url };
  }

  async trackClick(
    businessSlug: string,
    sessionId?: string,
    leadId?: string,
    rawToken?: string,
  ) {
    const profile = await this.resolveBusiness(businessSlug);

    // If session context is provided, verify authorization
    if (sessionId) {
      if (!rawToken) {
        throw new UnauthorizedException({
          message: 'Token sesi diperlukan untuk konteks ini',
          code: 'MISSING_CHAT_SESSION_TOKEN',
        });
      }
      await this.chatAuth.authorize(sessionId, profile.id, rawToken);
    }

    // If leadId is provided, verify it exists (best-effort, service layer in BE-08)
    // For now, just record the event

    const event = await this.repository.createClick({
      businessProfileId: profile.id,
      chatSessionId: sessionId ?? null,
      leadId: leadId ?? null,
    });

    return {
      id: event.id,
      clickedAt: event.clickedAt.toISOString(),
    };
  }

  private async resolveBusiness(slug: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new UnprocessableEntityException({
        message: 'Format slug bisnis tidak valid',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            field: 'businessSlug',
            message: 'Slug harus berupa huruf kecil, angka, dan tanda hubung',
          },
        ],
      });
    }

    const [profile] = await this.database.db
      .select({
        id: businessProfiles.id,
        slug: businessProfiles.slug,
        whatsappNumber: businessProfiles.whatsappNumber,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.slug, slug))
      .limit(1);

    if (!profile) {
      throw new NotFoundException({
        message: 'Bisnis tidak ditemukan',
        code: 'BUSINESS_NOT_FOUND',
      });
    }
    return profile;
  }
}
