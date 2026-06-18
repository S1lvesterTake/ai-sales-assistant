import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { leads } from '../../database/schema';
import {
  resolveBusinessBySlug,
  resolveBusinessWithWhatsappBySlug,
} from '../../common/utils/slug';
import { ChatSessionAuthService } from '../chat/chat-session-auth.service';
import { WhatsappRepository } from './whatsapp.repository';

const PREFILLED_MESSAGE =
  'Halo Kak, saya lihat katalog produk dan tertarik untuk order. Bisa dibantu?';

interface AuthorizedClickContext {
  sessionId: string | null;
  leadId: string | null;
}

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
    const profile = await resolveBusinessWithWhatsappBySlug(
      this.database,
      businessSlug,
    );

    await this.authorizeContext(profile, sessionId, leadId, rawToken);

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
    const profile = await resolveBusinessBySlug(this.database, businessSlug);
    const context = await this.authorizeContext(
      profile,
      sessionId,
      leadId,
      rawToken,
    );

    const event = await this.repository.createClick({
      businessProfileId: profile.id,
      chatSessionId: context.sessionId,
      leadId: context.leadId,
    });

    return {
      id: event.id,
      clickedAt: event.clickedAt.toISOString(),
    };
  }

  private async authorizeContext(
    profile: { id: string; slug: string },
    sessionId?: string,
    leadId?: string,
    rawToken?: string,
  ): Promise<AuthorizedClickContext> {
    let sessionIdToAuthorize = sessionId ?? null;
    let leadIdToRecord = leadId ?? null;

    if ((sessionId || leadId) && !rawToken) {
      throw new UnauthorizedException({
        message: 'Token sesi diperlukan untuk konteks ini',
        code: 'MISSING_CHAT_SESSION_TOKEN',
      });
    }

    if (leadId) {
      const [lead] = await this.database.db
        .select({
          id: leads.id,
          chatSessionId: leads.chatSessionId,
        })
        .from(leads)
        .where(
          and(eq(leads.id, leadId), eq(leads.businessProfileId, profile.id)),
        )
        .limit(1);

      if (!lead) {
        throw new NotFoundException({
          message: 'Lead tidak ditemukan',
          code: 'LEAD_NOT_FOUND',
        });
      }
      if (!lead.chatSessionId) {
        throw new UnauthorizedException({
          message: 'Lead ini tidak memiliki konteks sesi chat',
          code: 'LEAD_SESSION_NOT_AVAILABLE',
        });
      }
      if (sessionId && lead.chatSessionId !== sessionId) {
        throw new UnauthorizedException({
          message: 'Lead tidak sesuai dengan sesi chat',
          code: 'LEAD_SESSION_MISMATCH',
        });
      }
      sessionIdToAuthorize = lead.chatSessionId;
      leadIdToRecord = lead.id;
    }

    if (sessionIdToAuthorize) {
      if (!rawToken) {
        throw new UnauthorizedException({
          message: 'Token sesi diperlukan untuk konteks ini',
          code: 'MISSING_CHAT_SESSION_TOKEN',
        });
      }
      await this.chatAuth.authorize(sessionIdToAuthorize, profile.id, rawToken);
    }

    return {
      sessionId: sessionIdToAuthorize,
      leadId: leadIdToRecord,
    };
  }
}
