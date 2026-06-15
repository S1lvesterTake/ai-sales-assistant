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

interface OwnerSession {
  accessToken: string;
  userId: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ResponseBody {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
  meta?: PaginationMeta;
  errors?: Record<string, unknown>[];
}

function bodyOf(response: request.Response): ResponseBody {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.body;
}

describe('Product and FAQ knowledge management', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;
  let database: DatabaseService;
  let ownerA: OwnerSession;
  let ownerB: OwnerSession;

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

    ownerA = await registerOwner('owner-a@test.com');
    ownerB = await registerOwner('owner-b@test.com');
    await createProfile(ownerA.accessToken, {
      slug: `test-a-${randomUUID().slice(0, 8)}`,
      businessName: 'Business A',
      whatsappNumber: '6281234567890',
    });
    await createProfile(ownerB.accessToken, {
      slug: `test-b-${randomUUID().slice(0, 8)}`,
      businessName: 'Business B',
      whatsappNumber: '6289876543210',
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  async function registerOwner(email: string): Promise<OwnerSession> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: email.split('@')[0], email, password: 'Password123' })
      .expect(201);
    const body = bodyOf(response);
    return {
      accessToken: body.data.accessToken as string,
      userId: (body.data.user as Record<string, unknown>).id as string,
    };
  }

  async function createProfile(
    token: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(201);
    return bodyOf(response).data;
  }

  // ── Products ──────────────────────────────────────────────────────

  describe('POST /api/products', () => {
    it('creates a product', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Kopi Susu', price: 18_000, category: 'Kopi' })
        .expect(201);
      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Kopi Susu',
        price: 18_000,
        category: 'Kopi',
        isAvailable: true,
      });
      expect(body.data.id).toBeTruthy();
      expect(body.data.createdAt).toBeTruthy();
    });

    it('rejects missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ price: 10_000 })
        .expect(422);
    });

    it('rejects negative price', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Bad Product', price: -1 })
        .expect(422);
    });

    it('rejects without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .send({ name: 'Test', price: 1_000 })
        .expect(401);
    });
  });

  describe('GET /api/products', () => {
    beforeAll(async () => {
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
          .post('/api/products')
          .set('Authorization', `Bearer ${ownerA.accessToken}`)
          .send({
            name: `Product ${i}`,
            price: i * 10_000,
            category: i <= 3 ? 'Kopi' : 'Camilan',
          })
          .expect(201);
      }
    });

    it('returns paginated products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toMatchObject({ page: 1, limit: 20 });
      expect(body.meta!.total).toBeGreaterThanOrEqual(5);
    });

    it('filters by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products?category=Kopi')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const body = bodyOf(response);
      const items = body.data as unknown as Array<Record<string, unknown>>;
      for (const item of items) {
        expect(item.category).toBe('Kopi');
      }
    });

    it('filters by isAvailable', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products?isAvailable=true')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const body2 = bodyOf(response);
      const items2 = body2.data as unknown as Array<Record<string, unknown>>;
      for (const item of items2) {
        expect(item.isAvailable).toBe(true);
      }
    });

    it('enforces pagination bounds', async () => {
      await request(app.getHttpServer())
        .get('/api/products?limit=200')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(422);
    });

    it('isolates data between owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(200);
      expect(bodyOf(response).meta!.total).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Single Product', price: 25_000 })
        .expect(201);
      productId = bodyOf(response).data.id as string;
    });

    it('returns a product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const data = bodyOf(response).data;
      expect(data.name).toBe('Single Product');
    });

    it('returns 404 for cross-owner access', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(404);
    });

    it('returns 404 for unknown ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${randomUUID()}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Update Me', price: 10_000 })
        .expect(201);
      productId = bodyOf(response).data.id as string;
    });

    it('updates a product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Updated Product', price: 15_000 })
        .expect(200);
      const data = bodyOf(response).data;
      expect(data.name).toBe('Updated Product');
      expect(data.price).toBe(15_000);
    });

    it('rejects cross-owner update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('rejects empty update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Delete Me', price: 5_000 })
        .expect(201);
      productId = bodyOf(response).data.id as string;
    });

    it('deletes a product', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      expect(bodyOf(response).data).toBeNull();
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(404);
    });

    it('rejects cross-owner deletion', async () => {
      const other = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ name: 'Other Product', price: 8_000 })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/products/${bodyOf(other).data.id as string}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(404);
    });
  });

  // ── FAQs ──────────────────────────────────────────────────────────

  describe('POST /api/faqs', () => {
    it('creates a FAQ', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({
          question: 'Jam buka?',
          answer: 'Setiap hari 10.00-22.00',
          category: 'Operasional',
        })
        .expect(201);
      const body = bodyOf(response);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        question: 'Jam buka?',
        answer: 'Setiap hari 10.00-22.00',
        category: 'Operasional',
        isActive: true,
      });
      expect(body.data.id).toBeTruthy();
    });

    it('rejects missing question and answer', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({})
        .expect(422);
    });

    it('rejects without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs')
        .send({ question: 'Q?', answer: 'A.' })
        .expect(401);
    });
  });

  describe('GET /api/faqs', () => {
    beforeAll(async () => {
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/faqs')
          .set('Authorization', `Bearer ${ownerA.accessToken}`)
          .send({
            question: `Pertanyaan ${i}`,
            answer: `Jawaban ${i}`,
            category: i <= 2 ? 'Pemesanan' : 'Lainnya',
          })
          .expect(201);
      }
    });

    it('returns paginated FAQs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const body = bodyOf(response);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toMatchObject({ page: 1, limit: 20 });
    });

    it('searches FAQs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/faqs?search=Jawaban')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      expect(bodyOf(response).meta!.total).toBeGreaterThanOrEqual(3);
    });

    it('filters by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/faqs?category=Pemesanan')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const body3 = bodyOf(response);
      const items3 = body3.data as unknown as Array<Record<string, unknown>>;
      for (const item of items3) {
        expect(item.category).toBe('Pemesanan');
      }
    });

    it('isolates data between owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/faqs')
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(200);
      expect(bodyOf(response).meta!.total).toBe(0);
    });
  });

  describe('GET /api/faqs/:id', () => {
    let faqId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ question: 'Single FAQ', answer: 'Answer text' })
        .expect(201);
      faqId = bodyOf(response).data.id as string;
    });

    it('returns a FAQ by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      const data = bodyOf(response).data;
      expect(data.question).toBe('Single FAQ');
    });

    it('returns 404 for cross-owner access', async () => {
      await request(app.getHttpServer())
        .get(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/faqs/:id', () => {
    let faqId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ question: 'Update Me', answer: 'Old answer' })
        .expect(201);
      faqId = bodyOf(response).data.id as string;
    });

    it('updates a FAQ', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ answer: 'New answer', category: 'Operasional' })
        .expect(200);
      const data = bodyOf(response).data;
      expect(data.answer).toBe('New answer');
      expect(data.category).toBe('Operasional');
    });

    it('rejects cross-owner update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ answer: 'Hacked' })
        .expect(404);
    });

    it('rejects empty update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({})
        .expect(422);
    });
  });

  describe('DELETE /api/faqs/:id', () => {
    let faqId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ question: 'Delete Me', answer: 'Gone soon' })
        .expect(201);
      faqId = bodyOf(response).data.id as string;
    });

    it('deletes a FAQ', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(200);
      expect(bodyOf(response).data).toBeNull();
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/faqs/${faqId}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .expect(404);
    });

    it('rejects cross-owner deletion', async () => {
      const other = await request(app.getHttpServer())
        .post('/api/faqs')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ question: 'Other FAQ', answer: 'By owner A' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/faqs/${bodyOf(other).data.id as string}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .expect(404);
    });
  });
});
