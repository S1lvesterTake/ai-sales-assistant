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

describe('Lead capture and management', () => {
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
        name: 'Lead Biz',
        email: 'lead@test.com',
        password: 'Password123',
      })
      .expect(201);
    ownerToken = stringFromBody(bodyOf(registerRes), 'accessToken');

    businessSlug = `lead-biz-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        slug: businessSlug,
        businessName: 'Lead Business',
        whatsappNumber: '6281234567890',
      })
      .expect(201);

    const sessionRes = await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
      .send({})
      .expect(201);
    sessionId = stringFromBody(bodyOf(sessionRes), 'sessionId');
    sessionToken = stringFromBody(bodyOf(sessionRes), 'sessionToken');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  describe('POST /api/leads (JWT manual)', () => {
    it('creates a lead via JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Budi', phone: '081234567890' })
        .expect(201);

      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Budi');
      expect(body.data.phone).toBe('6281234567890'); // canonical
      expect(body.data.status).toBe('new');
      expect(body.data.source).toBe('manual');
    });

    it('normalizes phone to canonical format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Ani', phone: '+6289876543210' })
        .expect(201);

      expect(bodyOf(response).data.phone).toBe('6289876543210');
    });

    it('rejects duplicate phone', async () => {
      await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Citra', phone: '08111222333' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Citra Again', phone: '08111222333' })
        .expect(409);
    });

    it('rejects without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/leads')
        .send({ phone: '081234567890' })
        .expect(401);
    });

    it('rejects invalid phone format', async () => {
      await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ phone: '12345' })
        .expect(422);
    });
  });

  describe('POST /api/leads/from-chat/:businessSlug (chat token)', () => {
    it('creates a lead via chat token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/leads/from-chat/${businessSlug}`)
        .set('X-Chat-Session-Token', sessionToken)
        .send({
          name: 'Dewi',
          phone: '085512345678',
          chatSessionId: sessionId,
          interestSummary: 'Mau pesan kopi',
        })
        .expect(201);

      const body = bodyOf(response);
      expect(body.data.source).toBe('chatbot');
      expect(body.data.phone).toBe('6285512345678');
    });

    it('rejects without chat token', async () => {
      await request(app.getHttpServer())
        .post(`/api/leads/from-chat/${businessSlug}`)
        .send({ phone: '081234567890', chatSessionId: sessionId })
        .expect(401);
    });

    it('rejects without chatSessionId', async () => {
      await request(app.getHttpServer())
        .post(`/api/leads/from-chat/${businessSlug}`)
        .set('X-Chat-Session-Token', sessionToken)
        .send({ phone: '081234567890' })
        .expect(401);
    });

    it('rejects invalid token', async () => {
      await request(app.getHttpServer())
        .post(`/api/leads/from-chat/${businessSlug}`)
        .set('X-Chat-Session-Token', 'invalid-token')
        .send({ phone: '081234567890', chatSessionId: sessionId })
        .expect(401);
    });
  });

  describe('GET /api/leads (JWT list)', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Lead A', phone: '08111111111' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Lead B', phone: '08222222222' })
        .expect(201);
    });

    it('returns paginated leads', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toMatchObject({ page: 1, limit: 20 });
    });

    it('filters by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leads?status=new')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const items = bodyOf(response).data as unknown as Array<
        Record<string, unknown>
      >;
      for (const item of items) {
        expect(item.status).toBe('new');
      }
    });

    it('searches leads', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/leads?search=Lead A')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const body = bodyOf(response);
      expect(body.meta!.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/leads/:id (JWT detail)', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Detail Lead', phone: '08333333333' })
        .expect(201);
      leadId = stringFromBody(bodyOf(response), 'id');
    });

    it('returns lead by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/leads/${leadId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(bodyOf(response).data.name).toBe('Detail Lead');
    });

    it('returns 404 for unknown ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/leads/${randomUUID()}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/leads/:id/status', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leads')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Status Lead', phone: '08444444444' })
        .expect(201);
      leadId = stringFromBody(bodyOf(response), 'id');
    });

    it('updates lead status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'contacted' })
        .expect(200);
      expect(bodyOf(response).data.status).toBe('contacted');
    });

    it('rejects invalid status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'invalid' })
        .expect(422);
    });

    it('rejects without JWT', async () => {
      await request(app.getHttpServer())
        .patch(`/api/leads/${leadId}/status`)
        .send({ status: 'closed' })
        .expect(401);
    });
  });
});
