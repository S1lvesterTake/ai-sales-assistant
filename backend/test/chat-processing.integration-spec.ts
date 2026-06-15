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

describe('AI chat processing and idempotency', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;
  let database: DatabaseService;
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

    // Setup: register, create profile, create session
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'AI Biz',
        email: 'aichat@test.com',
        password: 'Password123',
      })
      .expect(201);
    const registerBody = bodyOf(registerRes);
    const accessToken = stringFromBody(registerBody, 'accessToken');

    businessSlug = `ai-biz-${randomUUID().slice(0, 8)}`;
    await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        slug: businessSlug,
        businessName: 'AI Business',
        whatsappNumber: '6281234567890',
      })
      .expect(201);

    // Seed some products and FAQs for context
    const token = `Bearer ${accessToken}`;
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', token)
      .send({ name: 'Kopi Susu', price: 18_000, category: 'Kopi' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/faqs')
      .set('Authorization', token)
      .send({
        question: 'Jam buka?',
        answer: 'Setiap hari 10.00-22.00 WITA',
        category: 'Operasional',
      })
      .expect(201);

    // Create chat session
    const sessionRes = await request(app.getHttpServer())
      .post(`/api/public/businesses/${businessSlug}/chat/sessions`)
      .send({})
      .expect(201);
    const sessionBody = bodyOf(sessionRes);
    sessionId = stringFromBody(sessionBody, 'sessionId');
    sessionToken = stringFromBody(sessionBody, 'sessionToken');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  function sendMessage(clientMessageId: string, message: string) {
    return request(app.getHttpServer())
      .post(
        `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
      )
      .set('X-Chat-Session-Token', sessionToken)
      .send({ clientMessageId, message });
  }

  describe('POST /api/public/businesses/:slug/chat/sessions/:id/messages', () => {
    it('processes a message and returns AI response', async () => {
      const response = await sendMessage(
        randomUUID(),
        'Halo, ada menu apa?',
      ).expect(200);

      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data.processingStatus).toBe('completed');
      expect(body.data.message).toBeTruthy();
      expect(body.data.clientMessageId).toBeTruthy();
      // Fake provider returns Indonesian
      const msg = stringFromBody(body, 'message');
      expect(msg.length).toBeGreaterThan(10);
    });

    it('returns stored response for duplicate completed clientMessageId', async () => {
      const msgId = randomUUID();

      const first = await sendMessage(msgId, 'Halo').expect(200);
      const firstMsg = stringFromBody(bodyOf(first), 'message');

      const second = await sendMessage(msgId, 'Halo').expect(200);
      const secondMsg = stringFromBody(bodyOf(second), 'message');

      // Same message returned, no new AI call
      expect(secondMsg).toBe(firstMsg);
      expect(bodyOf(second).data.processingStatus).toBe('completed');
    });

    it('rejects without token', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .send({ clientMessageId: randomUUID(), message: 'Test' })
        .expect(401);
    });

    it('rejects invalid clientMessageId format', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .send({ clientMessageId: 'not-a-uuid', message: 'Test' })
        .expect(422);
    });

    it('rejects empty message', async () => {
      await request(app.getHttpServer())
        .post(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .send({ clientMessageId: randomUUID(), message: '' })
        .expect(422);
    });

    it('appears in chat history', async () => {
      const msgId = randomUUID();
      await sendMessage(msgId, 'Ini pesan untuk history').expect(200);

      const historyRes = await request(app.getHttpServer())
        .get(
          `/api/public/businesses/${businessSlug}/chat/sessions/${sessionId}/messages`,
        )
        .set('X-Chat-Session-Token', sessionToken)
        .expect(200);

      const historyBody = bodyOf(historyRes);
      expect(historyBody.data).toBeInstanceOf(Array);
      // Should have customer + assistant messages
      const messages = historyBody.data as unknown as Array<
        Record<string, unknown>
      >;
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('replies include buying intent metadata when relevant', async () => {
      const response = await sendMessage(
        randomUUID(),
        'Berapa harga kopi susu? Saya tertarik beli',
      ).expect(200);

      const body = bodyOf(response);
      // The fake provider always returns the same response,
      // but buying intent detection runs on the combined text
      expect(typeof body.data.isBuyingIntentDetected).toBe('boolean');
      expect(typeof body.data.shouldShowWhatsappCta).toBe('boolean');
    });
  });
});
