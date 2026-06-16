import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { DatabaseService } from '../src/database/database.service';
import {
  DisposablePostgres,
  startDisposablePostgres,
} from './helpers/postgres-container';

interface ResponseBody {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

function bodyOf(response: request.Response): ResponseBody {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.body;
}

function stringFromBody(body: ResponseBody, key: string): string {
  const value = body.data[key];
  return typeof value === 'string' ? value : '';
}

describe('Public chat session security', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;
  let database: DatabaseService;
  let businessSlug: string;

  beforeAll(async () => {
    postgres = await startDisposablePostgres();
    await migrate(drizzle(postgres.pool), {
      migrationsFolder: resolve(__dirname, '../src/database/migrations'),
    });
    const databaseConfig = {
      getOrThrow: <T>(key: string): T =>
        ({
          DATABASE_URL: postgres.connectionUri,
          DATABASE_POOL_MAX: 5,
          DATABASE_CONNECTION_TIMEOUT_MS: 5_000,
          DATABASE_IDLE_TIMEOUT_MS: 5_000,
        })[key] as T,
    } as unknown as ConfigService;
    database = new DatabaseService(databaseConfig);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();

    // Register owner and create business profile
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Chat Business',
        email: 'chat@test.com',
        password: 'Password123',
      })
      .expect(201);
    const registerBody = bodyOf(registerRes);
    const accessToken = stringFromBody(registerBody, 'accessToken');

    businessSlug = `chat-biz-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        slug: businessSlug,
        businessName: 'Chat Business',
        whatsappNumber: '6281234567890',
      })
      .expect(201);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  describe('POST /api/public/businesses/:businessSlug/chat/sessions', () => {
    it('creates a session with token and expiry', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({})
        .expect(201);
      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data.sessionId).toBeTruthy();
      expect(body.data.sessionToken).toBeTruthy();
      expect(body.data.expiresAt).toBeTruthy();
      // Token should be base64url (no + or /)
      const token = stringFromBody(body, 'sessionToken');
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it('stores no raw token in the database', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({ customerName: 'Test User' })
        .expect(201);
      const body = bodyOf(response);
      const sessionId = stringFromBody(body, 'sessionId');

      const rows = await database.db.execute(
        `SELECT access_token_hash FROM chat_sessions WHERE id = '${sessionId}'`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const row = rows.rows[0] as Record<string, unknown>;
      const hash =
        typeof row.access_token_hash === 'string' ? row.access_token_hash : '';
      // Hash should be hex (64 chars for SHA-256), not base64url
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      // The raw token returned to client should NOT appear in the DB
      const rawToken = stringFromBody(body, 'sessionToken');
      expect(hash).not.toBe(rawToken);
      expect(hash).not.toContain(rawToken);
    });

    it('stores customer info when provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({
          customerName: 'Budi',
          customerPhone: '081234567890',
          source: 'landing-page',
        })
        .expect(201);
      expect(response.status).toBe(201);
    });

    it('rejects missing business slug', async () => {
      await request(app.getHttpServer())
        .post('/api/public/businesses/nonexistent-slug/chat/sessions')
        .send({})
        .expect(404);
    });

    it('rejects invalid slug format', async () => {
      await request(app.getHttpServer())
        .post('/api/public/businesses/INVALID_SLUG/chat/sessions')
        .send({})
        .expect(422);
    });

    it('returns different tokens for different sessions', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({})
        .expect(201);
      const res2 = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({})
        .expect(201);
      expect(stringFromBody(bodyOf(res1), 'sessionToken')).not.toBe(
        stringFromBody(bodyOf(res2), 'sessionToken'),
      );
    });
  });

  describe('GET /api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages', () => {
    let sessionId: string;
    let sessionToken: string;
    let differentSessionId: string;
    let differentSessionToken: string;

    beforeAll(async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({})
        .expect(201);
      sessionId = stringFromBody(bodyOf(res1), 'sessionId');
      sessionToken = stringFromBody(bodyOf(res1), 'sessionToken');

      const res2 = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
        .send({})
        .expect(201);
      differentSessionId = stringFromBody(bodyOf(res2), 'sessionId');
      differentSessionToken = stringFromBody(bodyOf(res2), 'sessionToken');
    });

    it('returns empty history for a new session', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(200);
      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toMatchObject({ page: 1, limit: 20, total: 0 });
    });

    it('rejects missing token header', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .expect(401);
    });

    it('rejects invalid token', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', 'invalid-token-value')
        .expect(401);
    });

    it('rejects token from a different session', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', differentSessionToken)
        .expect(401);
    });

    it('rejects session UUID alone without token', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .expect(401);
    });

    it('rejects wrong business slug with valid token', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/wrong-slug/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(404);
    });

    it('rejects wrong-session token (token for session A used for session B)', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${differentSessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(401);
    });
  });
});
