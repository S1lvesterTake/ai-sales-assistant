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
  let ownerToken: string;
  let businessSlug: string;
  let sessionId: string;
  let sessionToken: string;

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

    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Dash Biz',
        email: 'dash@test.com',
        password: 'Password123',
      })
      .expect(201);
    ownerToken = stringFromBody(bodyOf(registerRes), 'accessToken');

    businessSlug = `dash-biz-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        slug: businessSlug,
        businessName: 'Dashboard Business',
        whatsappNumber: '6281234567890',
      })
      .expect(201);

    // Seed leads
    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Lead 1', phone: '08111111111' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Lead 2', phone: '08222222222' })
      .expect(201);

    // Seed WhatsApp clicks
    await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
      .send({})
      .expect(201);

    // Create chat session and send messages
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
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  describe('GET /api/dashboard/summary', () => {
    it('returns aggregate counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data.totalLeads).toBeGreaterThanOrEqual(2);
      expect(body.data.newLeads).toBeGreaterThanOrEqual(2);
      expect(body.data.totalChatSessions).toBeGreaterThanOrEqual(1);
      expect(body.data.whatsappClicks).toBeGreaterThanOrEqual(2);
    });

    it('rejects without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/recent-leads', () => {
    it('returns bounded recent leads', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/recent-leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      const items = body.data as unknown as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('respects limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/recent-leads?limit=1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = bodyOf(response).data as unknown as Array<
        Record<string, unknown>
      >;
      expect(items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/dashboard/recent-conversations', () => {
    it('returns recent conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/recent-conversations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/dashboard/top-questions', () => {
    it('returns top questions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/top-questions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/dashboard/conversations/:sessionId/messages', () => {
    it('returns conversation messages for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta?.total).toBeGreaterThanOrEqual(2);
    });

    it('rejects cross-owner conversation access', async () => {
      // Register another user and try to access first owner's conversation
      const otherRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Other',
          email: 'other-dash@test.com',
          password: 'Password123',
        })
        .expect(201);
      const otherToken = stringFromBody(bodyOf(otherRes), 'accessToken');

      await request(app.getHttpServer())
        .post('/api/business-profile')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          slug: `other-${randomUUID().slice(0, 8)}`,
          businessName: 'Other Biz',
          whatsappNumber: '6289876543210',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/dashboard/conversations/${sessionId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
