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
}

function bodyOf(response: request.Response): ResponseBody {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.body;
}

function stringFromBody(body: ResponseBody, key: string): string {
  const value = body.data[key];
  return typeof value === 'string' ? value : '';
}

describe('WhatsApp link and click tracking', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;
  let businessSlug: string;
  let sessionId: string;
  let sessionToken: string;
  let leadId: string;

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

    // Setup business and chat session
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'WA Biz',
        email: 'wa@test.com',
        password: 'Password123',
      })
      .expect(201);
    const accessToken = stringFromBody(bodyOf(registerRes), 'accessToken');

    businessSlug = `wa-biz-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        slug: businessSlug,
        businessName: 'WA Business',
        whatsappNumber: '6281234567890',
      })
      .expect(201);

    const sessionRes = await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
      .send({})
      .expect(201);
    sessionId = stringFromBody(bodyOf(sessionRes), 'sessionId');
    sessionToken = stringFromBody(bodyOf(sessionRes), 'sessionToken');

    const leadRes = await request(app.getHttpServer())
      .post(`/api/leads/from-chat/${businessSlug}`)
      .set('X-Chat-Session-Token', sessionToken)
      .send({
        name: 'WA Lead',
        phone: '085511122233',
        chatSessionId: sessionId,
      })
      .expect(201);
    leadId = stringFromBody(bodyOf(leadRes), 'id');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  describe('GET /api/public/businesses/:slug/whatsapp/link', () => {
    it('generates a valid wa.me URL without context', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/public/businesses/${businessSlug}/whatsapp/link`)
        .expect(200);

      const body = bodyOf(response);
      expect(body.success).toBe(true);
      const url = stringFromBody(body, 'url');
      expect(url).toContain('https://wa.me/6281234567890');
      expect(url).toContain('text=');
    });

    it('generates a link with session context when valid token provided', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/whatsapp/link?sessionId=${sessionId}`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(200);

      const url = stringFromBody(bodyOf(response), 'url');
      expect(url).toContain('wa.me');
    });

    it('rejects session context without token', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/whatsapp/link?sessionId=${sessionId}`,
        )
        .expect(401);
    });

    it('rejects invalid token for session context', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/whatsapp/link?sessionId=${sessionId}`,
        )
        .set('X-Chat-Session-Token', 'invalid-token')
        .expect(401);
    });

    it('requires token proof when lead context is provided', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/whatsapp/link?leadId=${leadId}`,
        )
        .expect(401);
    });

    it('generates a lead-context link when the matching session token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/whatsapp/link?leadId=${leadId}`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(200);

      expect(stringFromBody(bodyOf(response), 'url')).toContain(
        'https://wa.me/6281234567890',
      );
    });

    it('rejects invalid business slug', async () => {
      await request(app.getHttpServer())
        .get('/api/public/businesses/INVALID_SLUG/whatsapp/link')
        .expect(422);
    });

    it('returns 404 for unknown business', async () => {
      await request(app.getHttpServer())
        .get('/api/public/businesses/unknown-biz/whatsapp/link')
        .expect(404);
    });
  });

  describe('POST /api/public/businesses/:slug/whatsapp-clicks', () => {
    it('records a context-free click event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .send({})
        .expect(201);

      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeTruthy();
      expect(body.data.clickedAt).toBeTruthy();
    });

    it('records a click event with session context', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .set('X-Chat-Session-Token', sessionToken)
        .send({ sessionId })
        .expect(201);

      const body = bodyOf(response);
      expect(body.data.id).toBeTruthy();
    });

    it('rejects lead context without token', async () => {
      await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .send({ leadId })
        .expect(401);
    });

    it('records a click event with lead context and matching token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .set('X-Chat-Session-Token', sessionToken)
        .send({ leadId })
        .expect(201);

      expect(bodyOf(response).data.id).toBeTruthy();
    });

    it('rejects session context without token', async () => {
      await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .send({ sessionId })
        .expect(401);
    });

    it('rejects invalid UUID format for sessionId', async () => {
      await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .send({ sessionId: 'not-a-uuid' })
        .expect(422);
    });

    it('works without session context (landing page CTA)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/public/businesses/${businessSlug}/whatsapp-clicks`)
        .send({})
        .expect(201);

      expect(bodyOf(response).data.id).toBeTruthy();
    });
  });
});
