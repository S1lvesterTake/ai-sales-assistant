import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { chatSessions } from '../../database/schema';
import { tokensMatch } from './session-token.utils';

export interface AuthorizedSession {
  sessionId: string;
  businessProfileId: string;
}

@Injectable()
export class ChatSessionAuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async authorize(
    sessionId: string,
    businessProfileId: string,
    rawToken: string,
  ): Promise<AuthorizedSession> {
    const [session] = await this.database.db
      .select({
        id: chatSessions.id,
        accessTokenHash: chatSessions.accessTokenHash,
        expiresAt: chatSessions.expiresAt,
        businessProfileId: chatSessions.businessProfileId,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new UnauthorizedException({
        message: 'Sesi chat tidak ditemukan',
        code: 'CHAT_SESSION_NOT_FOUND',
      });
    }

    if (session.businessProfileId !== businessProfileId) {
      throw new UnauthorizedException({
        message: 'Sesi chat tidak ditemukan',
        code: 'CHAT_SESSION_NOT_FOUND',
      });
    }

    if (!tokensMatch(rawToken, session.accessTokenHash)) {
      throw new UnauthorizedException({
        message: 'Token sesi tidak valid',
        code: 'INVALID_CHAT_SESSION_TOKEN',
      });
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException({
        message: 'Sesi chat telah berakhir',
        code: 'CHAT_SESSION_EXPIRED',
      });
    }

    return {
      sessionId: session.id,
      businessProfileId: session.businessProfileId,
    };
  }
}
