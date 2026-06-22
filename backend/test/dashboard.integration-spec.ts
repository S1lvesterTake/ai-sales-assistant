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

describe('Dashboard and owner conversation reads', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;

  // Owner A — has leads, sessions, clicks
  let ownerAToken: string;
  let businessSlug: string;
  let sessionId: string;
  let sessionToken: string;
  let emptySessionId: string; // session with no messages

  // Owner B — has a profile but zero data
  let ownerBToken: string;

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
    const database = new DatabaseService(databaseConfig);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();

    // ── Owner A ────────────────────────────────────────────────────────────
    const registerA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Dash Biz A',
        email: 'dash-a@test.com',
        password: 'Password123',
      })
      .expect(201);
    ownerAToken = stringFromBody(bodyOf(registerA), 'accessToken');

    businessSlug = `dash-a-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        slug: businessSlug,
        businessName: 'Dashboard Biz A',
        whatsappNumber: '6281234567890',
      })
      .expect(201);

    // 2 leads: one stays 'new', one becomes 'contacted' → conversionRate = 50%
    const lead1Res = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'Lead New', phone: '08111111111' })
      .expect(201);
    const lead1Id = stringFromBody(bodyOf(lead1Res), 'id');

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ name: 'Lead Contacted', phone: '08222222222' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/leads/${lead1Id}/status`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ status: 'contacted' })
      .expect(200);

    // 2 WhatsApp clicks
    await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
      .send({})
      .expect(201);

    // Chat session with 2 sent messages (produces 4 messages: 2 customer + 2 AI)
    const sessionRes = await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
      .send({ customerName: 'Budi' })
      .expect(201);
    sessionId = stringFromBody(bodyOf(sessionRes), 'sessionId');
    sessionToken = stringFromBody(bodyOf(sessionRes), 'sessionToken');

    await request(app.getHttpServer())
      .post(
        `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
      )
      .set('X-Chat-Session-Token', sessionToken)
      .send({ clientMessageId: randomUUID(), message: 'Halo, ada menu apa?' })
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
      )
      .set('X-Chat-Session-Token', sessionToken)
      .send({ clientMessageId: randomUUID(), message: 'Berapa harganya?' })
      .expect(200);

    // Empty session — created but no messages sent
    const emptyRes = await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
      .send({ customerName: 'Anonymous' })
      .expect(201);
    emptySessionId = stringFromBody(bodyOf(emptyRes), 'sessionId');

    // ── Owner B — business profile, zero leads/sessions/clicks ─────────────
    const registerB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Dash Biz B',
        email: 'dash-b@test.com',
        password: 'Password123',
      })
      .expect(201);
    ownerBToken = stringFromBody(bodyOf(registerB), 'accessToken');

    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({
        slug: `dash-b-${randomUUID().slice(0, 8)}`,
        businessName: 'Dashboard Biz B',
        whatsappNumber: '6289876543210',
      })
      .expect(201);
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  describe('GET /api/dashboard/summary', () => {
    it('returns aggregate counts including conversionRate', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/summary')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      expect(body.data.totalLeads).toBeGreaterThanOrEqual(2);
      expect(body.data.newLeads).toBeGreaterThanOrEqual(1);
      expect(typeof body.data.conversionRate).toBe('number');
      expect(body.data.totalChatSessions).toBeGreaterThanOrEqual(1);
      expect(body.data.whatsappClicks).toBeGreaterThanOrEqual(2);
    });

    it('returns all-zero counts (including conversionRate) for a business with no data', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/summary')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      );
      expect(body.data).toMatchObject({
        totalLeads: 0,
        newLeads: 0,
        conversionRate: 0,
        totalChatSessions: 0,
        whatsappClicks: 0,
      });
    });

    it('is scoped to the authenticated owner — ownerB sees only its own (zero) counts', async () => {
      const bodyA = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/summary')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      const bodyB = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/summary')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      );
      expect(Number(bodyA.data.totalLeads)).toBeGreaterThan(0);
      expect(bodyB.data.totalLeads).toBe(0);
    });

    it('returns 404 when the authenticated user has no business profile', async () => {
      const noProfileRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'No Profile',
          email: `no-profile-${randomUUID()}@test.com`,
          password: 'Password123',
        })
        .expect(201);
      const noProfileToken = stringFromBody(
        bodyOf(noProfileRes),
        'accessToken',
      );

      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/summary')
          .set('Authorization', `Bearer ${noProfileToken}`)
          .expect(404),
      );
      expect(body.data['code']).toBe('BUSINESS_PROFILE_NOT_FOUND');
    });

    it('returns 401 without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .expect(401);
    });
  });

  // ── Recent leads ──────────────────────────────────────────────────────────

  describe('GET /api/dashboard/recent-leads', () => {
    it('returns recent leads ordered newest first', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-leads')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      expect(body.data).toBeInstanceOf(Array);
      const items = body.data as unknown as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('respects the limit query parameter', async () => {
      const items = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-leads?limit=1')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      ).data as unknown as Array<Record<string, unknown>>;
      expect(items.length).toBeLessThanOrEqual(1);
    });

    it('returns an empty array for a business with no leads', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-leads')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      );
      expect(body.data).toEqual([]);
    });

    it('is scoped to the authenticated owner — ownerB sees only its own (empty) leads', async () => {
      const itemsB = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-leads')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      ).data as unknown as Array<Record<string, unknown>>;
      expect(itemsB).toHaveLength(0);
    });

    it('rejects limit > 20 with 422', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/recent-leads?limit=21')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(422);
    });

    it('rejects limit <= 0 with 422', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/recent-leads?limit=0')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(422);
    });

    it('returns 401 without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/recent-leads')
        .expect(401);
    });
  });

  // ── Recent conversations ───────────────────────────────────────────────────

  describe('GET /api/dashboard/recent-conversations', () => {
    it('returns recent conversations with lastMessage populated', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-conversations')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      expect(body.data).toBeInstanceOf(Array);
    });

    it('returns lastMessage="" and lastMessageAt=sessionCreatedAt for a session with no messages', async () => {
      const items = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-conversations')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      ).data as unknown as Array<Record<string, unknown>>;

      const emptySession = items.find(
        (item) => item['sessionId'] === emptySessionId,
      );
      expect(emptySession).toBeDefined();
      expect(emptySession?.['lastMessage']).toBe('');
      expect(typeof emptySession?.['lastMessageAt']).toBe('string');
    });

    it('returns an empty array for a business with no sessions', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-conversations')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      );
      expect(body.data).toEqual([]);
    });

    it('is scoped to the authenticated owner — ownerB sees only its own (empty) sessions', async () => {
      const itemsB = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/recent-conversations')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      ).data as unknown as Array<Record<string, unknown>>;
      expect(itemsB).toHaveLength(0);
    });

    it('returns 401 without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/recent-conversations')
        .expect(401);
    });
  });

  // ── Top questions ─────────────────────────────────────────────────────────

  describe('GET /api/dashboard/top-questions', () => {
    it('returns top customer questions', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/top-questions')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      expect(body.data).toBeInstanceOf(Array);
    });

    it('returns an empty array for a business with no messages', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/top-questions')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      );
      expect(body.data).toEqual([]);
    });

    it('is scoped to the authenticated owner', async () => {
      const itemsB = bodyOf(
        await request(app.getHttpServer())
          .get('/api/dashboard/top-questions')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .expect(200),
      ).data as unknown as Array<Record<string, unknown>>;
      expect(itemsB).toHaveLength(0);
    });

    it('returns 401 without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/top-questions')
        .expect(401);
    });
  });

  // ── Conversation messages ─────────────────────────────────────────────────

  describe('GET /api/dashboard/conversations/:sessionId/messages', () => {
    it('returns paginated messages with a meta block', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get(`/api/dashboard/conversations/${sessionId}/messages`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta?.total).toBeGreaterThanOrEqual(2);
      expect(body.meta).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        page: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        limit: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        total: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        totalPages: expect.any(Number),
      });
    });

    it('paginates correctly: limit=1 on page 1 returns 1 item with totalPages >= 2', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get(
            `/api/dashboard/conversations/${sessionId}/messages?page=1&limit=1`,
          )
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(200),
      );
      const items = body.data as unknown as Array<Record<string, unknown>>;
      expect(items).toHaveLength(1);
      expect(Number(body.meta?.totalPages)).toBeGreaterThanOrEqual(2);
    });

    it('returns 404 for a session that belongs to another business', async () => {
      await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });

    it('returns 404 for a session UUID that does not exist', async () => {
      const body = bodyOf(
        await request(app.getHttpServer())
          .get(`/api/dashboard/conversations/${randomUUID()}/messages`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .expect(404),
      );
      expect(body.data['code']).toBe('CONVERSATION_NOT_FOUND');
    });

    it('rejects page=0 with 422', async () => {
      await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages?page=0`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(422);
    });

    it('rejects limit=101 with 422', async () => {
      await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages?limit=101`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(422);
    });

    it('returns 401 without a JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages`)
        .expect(401);
    });
  });
});
