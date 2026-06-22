import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { hashToken } from './session-token.utils';
import { ChatSessionAuthService } from './chat-session-auth.service';

const SESSION_ID = '019b9d80-0000-0000-0000-000000000001';
const BIZ_ID = '019b9d80-0000-0000-0000-000000000002';
const RAW_TOKEN = 'valid-raw-token';
const TOKEN_HASH = hashToken(RAW_TOKEN);

function makeDb(sessionOverride?: Record<string, unknown> | null) {
  const row =
    sessionOverride !== undefined
      ? sessionOverride
      : {
          id: SESSION_ID,
          accessTokenHash: TOKEN_HASH,
          expiresAt: new Date(Date.now() + 60_000),
          businessProfileId: BIZ_ID,
        };
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(row !== null ? [row] : []),
    },
  } as unknown as DatabaseService;
}

function makeConfig() {
  return {} as unknown as ConfigService;
}

describe('ChatSessionAuthService', () => {
  it('returns the authorized session when token and business match', async () => {
    const service = new ChatSessionAuthService(makeDb(), makeConfig());

    const result = await service.authorize(SESSION_ID, BIZ_ID, RAW_TOKEN);

    expect(result).toEqual({
      sessionId: SESSION_ID,
      businessProfileId: BIZ_ID,
    });
  });

  it('throws UnauthorizedException when session is not found', async () => {
    const service = new ChatSessionAuthService(makeDb(null), makeConfig());

    await expect(
      service.authorize(SESSION_ID, BIZ_ID, RAW_TOKEN),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when businessProfileId does not match', async () => {
    const service = new ChatSessionAuthService(makeDb(), makeConfig());

    await expect(
      service.authorize(SESSION_ID, 'wrong-biz-id', RAW_TOKEN),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token hash does not match', async () => {
    const service = new ChatSessionAuthService(makeDb(), makeConfig());

    await expect(
      service.authorize(SESSION_ID, BIZ_ID, 'wrong-token'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session is expired', async () => {
    const expiredSession = {
      id: SESSION_ID,
      accessTokenHash: TOKEN_HASH,
      expiresAt: new Date(Date.now() - 1_000),
      businessProfileId: BIZ_ID,
    };
    const service = new ChatSessionAuthService(
      makeDb(expiredSession),
      makeConfig(),
    );

    await expect(
      service.authorize(SESSION_ID, BIZ_ID, RAW_TOKEN),
    ).rejects.toThrow(UnauthorizedException);
  });
});
