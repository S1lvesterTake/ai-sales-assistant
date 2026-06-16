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
  DEMO_EMAIL,
  DEMO_FAQS,
  DEMO_PRODUCTS,
  DEMO_PROFILE,
} from '../src/database/seeds/demo-data';
import { DemoDataService } from '../src/database/seeds/demo-data.service';
import {
  DisposablePostgres,
  startDisposablePostgres,
} from './helpers/postgres-container';

interface OwnerSession {
  accessToken: string;
  userId: string;
}

describe('Business profile and demo operations', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;
  let database: DatabaseService;

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
    const accessToken = response.text.match(/"accessToken":"([^"]+)"/)?.[1];
    const userId = response.text.match(/"id":"([^"]+)"/)?.[1];
    if (!accessToken || !userId)
      throw new Error('Registration response invalid');
    return { accessToken, userId };
  }

  function createProfile(
    owner: OwnerSession,
    slug: string,
    overrides: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/business-profile')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        businessName: `Business ${slug}`,
        slug,
        whatsappNumber: '0812 3456 7890',
        operatingHours: 'Setiap hari 09.00-20.00 WITA',
        ...overrides,
      });
  }

  function demoService(resetAllowed: boolean): DemoDataService {
    const values: Record<string, unknown> = {
      DEMO_USER_PASSWORD: 'DemoKopiSenja2026!',
      DEMO_DATA_RESET_ON_DEPLOY: resetAllowed,
    };
    const config = {
      get: <T>(key: string): T | undefined => values[key] as T | undefined,
    } as ConfigService;
    return new DemoDataService(database, config);
  }

  it('creates, retrieves, updates, and isolates private profiles by JWT owner', async () => {
    await request(app.getHttpServer()).get('/api/business-profile').expect(401);
    const ownerA = await registerOwner('profile-a@example.com');
    const ownerB = await registerOwner('profile-b@example.com');

    await request(app.getHttpServer())
      .get('/api/business-profile')
      .set('Authorization', `Bearer ${ownerA.accessToken}`)
      .expect(404);

    const created = await createProfile(ownerA, 'business-a', {
      description: '  Deskripsi awal  ',
      ctaMessage: 'Hubungi kami',
    }).expect(201);
    expect(created.body).toMatchObject({
      success: true,
      data: {
        businessName: 'Business business-a',
        slug: 'business-a',
        whatsappNumber: '6281234567890',
        description: 'Deskripsi awal',
      },
    });

    await request(app.getHttpServer())
      .get('/api/business-profile')
      .set('Authorization', `Bearer ${ownerB.accessToken}`)
      .expect(404);

    await createProfile(ownerB, 'business-b').expect(201);
    await request(app.getHttpServer())
      .get('/api/business-profile')
      .set('Authorization', `Bearer ${ownerA.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ data: { slug: 'business-a' } });
      });
    await request(app.getHttpServer())
      .get('/api/business-profile')
      .set('Authorization', `Bearer ${ownerB.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ data: { slug: 'business-b' } });
      });

    await request(app.getHttpServer())
      .patch('/api/business-profile')
      .set('Authorization', `Bearer ${ownerA.accessToken}`)
      .send({
        description: '',
        whatsappNumber: '+62 (813) 4567-8901',
        ctaMessage: 'Pesan sekarang',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          data: {
            slug: 'business-a',
            description: null,
            whatsappNumber: '6281345678901',
            ctaMessage: 'Pesan sekarang',
          },
        });
      });
  });

  it('rejects invalid, protected, immutable, duplicate, and empty payloads', async () => {
    const invalidOwner = await registerOwner('invalid-profile@example.com');
    for (const payload of [
      {
        businessName: 'Invalid Slug',
        slug: 'Invalid Slug',
        whatsappNumber: '081234567890',
      },
      {
        businessName: 'Invalid Phone',
        slug: 'invalid-phone',
        whatsappNumber: '812345',
      },
      {
        businessName: 'Injected Owner',
        slug: 'injected-owner',
        whatsappNumber: '081234567890',
        userId: randomUUID(),
        businessProfileId: randomUUID(),
        isDemo: true,
      },
    ]) {
      await request(app.getHttpServer())
        .post('/api/business-profile')
        .set('Authorization', `Bearer ${invalidOwner.accessToken}`)
        .send(payload)
        .expect(422);
    }

    const owner = await registerOwner('immutable-profile@example.com');
    await createProfile(owner, 'immutable-profile').expect(201);
    await request(app.getHttpServer())
      .patch('/api/business-profile')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ slug: 'changed-slug' })
      .expect(422);
    await request(app.getHttpServer())
      .patch('/api/business-profile')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(422);
    await createProfile(owner, 'second-profile').expect(409);

    const duplicateSlugOwner = await registerOwner(
      'duplicate-slug-profile@example.com',
    );
    await createProfile(duplicateSlugOwner, 'immutable-profile').expect(409);
  });

  it('uses the database unique constraint for concurrent one-profile creation', async () => {
    const owner = await registerOwner('concurrent-profile@example.com');
    const responses = await Promise.all([
      createProfile(owner, 'concurrent-profile-a'),
      createProfile(owner, 'concurrent-profile-b'),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const count = await postgres.pool.query<{ count: string }>(
      `select count(*)::text as count from business_profiles where user_id = $1`,
      [owner.userId],
    );
    expect(count.rows[0]?.count).toBe('1');
  });

  it('returns a bounded public projection resolved only by slug', async () => {
    const profile = await postgres.pool.query<{ id: string }>(
      `select id from business_profiles where slug = 'business-a'`,
    );
    const profileId = profile.rows[0]?.id;
    await postgres.pool.query(
      `insert into products
        (business_profile_id, name, description, price, is_available)
       values ($1, 'Produk Publik', 'Deskripsi', 10000, true)`,
      [profileId],
    );
    await postgres.pool.query(
      `insert into faqs
        (business_profile_id, question, answer, is_active)
       values ($1, 'Apakah tersedia hari ini?', 'Tersedia.', true)`,
      [profileId],
    );

    const response = await request(app.getHttpServer())
      .get('/api/public/businesses/business-a')
      .expect(200);
    const publicData = (
      response.body as unknown as {
        data: Record<string, unknown> & { suggestedQuestions: string[] };
      }
    ).data;
    expect(publicData).toMatchObject({
      slug: 'business-a',
      businessName: 'Business business-a',
    });
    expect(publicData.suggestedQuestions).toEqual([
      'Berapa harga Produk Publik?',
      'Apakah tersedia hari ini?',
      'Jam bukanya sampai kapan?',
    ]);
    for (const privateField of [
      'id',
      'userId',
      'businessProfileId',
      'whatsappNumber',
      'createdAt',
      'updatedAt',
    ]) {
      expect(publicData).not.toHaveProperty(privateField);
    }

    await request(app.getHttpServer())
      .get('/api/public/businesses/INVALID_slug')
      .expect(422);
    await request(app.getHttpServer())
      .get('/api/public/businesses/not-found')
      .expect(404);
  });

  it('seeds demo data idempotently and protects core demo identity', async () => {
    const service = demoService(true);
    await expect(service.execute('seed')).resolves.toMatchObject({
      command: 'seed',
      businessSlug: DEMO_PROFILE.slug,
      productCount: DEMO_PRODUCTS.length,
      faqCount: DEMO_FAQS.length,
    });
    await expect(service.execute('seed')).resolves.toMatchObject({
      command: 'seed',
    });

    const state = await postgres.pool.query<{
      faq_count: string;
      product_count: string;
      user_count: string;
    }>(
      `select
         (select count(*) from users where email = $1 and is_demo = true)::text as user_count,
         (select count(*) from products p join business_profiles b on b.id = p.business_profile_id where b.slug = $2)::text as product_count,
         (select count(*) from faqs f join business_profiles b on b.id = f.business_profile_id where b.slug = $2)::text as faq_count`,
      [DEMO_EMAIL, DEMO_PROFILE.slug],
    );
    expect(state.rows[0]).toEqual({
      user_count: '1',
      product_count: String(DEMO_PRODUCTS.length),
      faq_count: String(DEMO_FAQS.length),
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: DEMO_EMAIL, password: 'DemoKopiSenja2026!' })
      .expect(200);
    const token = login.text.match(/"accessToken":"([^"]+)"/)?.[1];
    expect(token).toBeDefined();

    await request(app.getHttpServer())
      .patch('/api/business-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        businessName: 'Demo Diubah',
        category: 'Kategori Diubah',
        whatsappNumber: '081399999999',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'DEMO_PROFILE_FIELD_PROTECTED' });
      });
    await request(app.getHttpServer())
      .patch('/api/business-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ctaMessage: 'CTA demo sementara' })
      .expect(200);
  });

  it('refuses unguarded reset without modifying demo records', async () => {
    const demoProfile = await postgres.pool.query<{ id: string }>(
      `select id from business_profiles where slug = $1`,
      [DEMO_PROFILE.slug],
    );
    const extraProductId = randomUUID();
    await postgres.pool.query(
      `insert into products
        (id, business_profile_id, name, price, is_available)
       values ($1, $2, 'Produk Guard', 1, true)`,
      [extraProductId, demoProfile.rows[0]?.id],
    );

    await expect(demoService(false).execute('reset')).rejects.toThrow(
      'DEMO_DATA_RESET_ON_DEPLOY must be true',
    );
    const product = await postgres.pool.query(
      `select id from products where id = $1`,
      [extraProductId],
    );
    expect(product.rowCount).toBe(1);
  });

  it('rolls back a failed reset transaction after destructive work begins', async () => {
    const before = await postgres.pool.query<{ count: string }>(
      `select count(*)::text as count
       from products p
       join business_profiles b on b.id = p.business_profile_id
       where b.slug = $1`,
      [DEMO_PROFILE.slug],
    );
    await postgres.pool.query(`
      create function reject_demo_product_insert() returns trigger as $$
      begin
        if new.name = 'Kopi Susu Gula Aren' then
          raise exception 'forced demo reset failure';
        end if;
        return new;
      end;
      $$ language plpgsql
    `);
    await postgres.pool.query(`
      create trigger reject_demo_product_insert_trigger
      before insert on products
      for each row execute function reject_demo_product_insert()
    `);

    try {
      await expect(demoService(true).execute('reset')).rejects.toThrow();
    } finally {
      await postgres.pool.query(
        `drop trigger reject_demo_product_insert_trigger on products`,
      );
      await postgres.pool.query(`drop function reject_demo_product_insert()`);
    }

    const after = await postgres.pool.query<{ count: string }>(
      `select count(*)::text as count
       from products p
       join business_profiles b on b.id = p.business_profile_id
       where b.slug = $1`,
      [DEMO_PROFILE.slug],
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });

  it('resets only demo-owned data and remains idempotent', async () => {
    const nonDemoProfile = await postgres.pool.query<{ id: string }>(
      `select id from business_profiles where slug = 'business-b'`,
    );
    const nonDemoProductId = randomUUID();
    await postgres.pool.query(
      `insert into products
        (id, business_profile_id, name, price, is_available)
       values ($1, $2, 'Produk Non Demo', 5000, true)`,
      [nonDemoProductId, nonDemoProfile.rows[0]?.id],
    );

    const demoProfile = await postgres.pool.query<{ id: string }>(
      `select id from business_profiles where slug = $1`,
      [DEMO_PROFILE.slug],
    );
    const demoProfileId = demoProfile.rows[0]?.id;
    const sessionId = randomUUID();
    const leadId = randomUUID();
    await postgres.pool.query(
      `insert into chat_sessions
        (id, business_profile_id, access_token_hash, expires_at)
       values ($1, $2, 'demo-hash', now() + interval '1 hour')`,
      [sessionId, demoProfileId],
    );
    await postgres.pool.query(
      `insert into chat_messages
        (chat_session_id, client_message_id, processing_status, role, message)
       values ($1, $2, 'pending', 'customer', 'Pesan demo')`,
      [sessionId, randomUUID()],
    );
    await postgres.pool.query(
      `insert into leads
        (id, business_profile_id, chat_session_id, phone, status)
       values ($1, $2, $3, '628999999999', 'new')`,
      [leadId, demoProfileId, sessionId],
    );
    await postgres.pool.query(
      `insert into whatsapp_click_events
        (business_profile_id, chat_session_id, lead_id)
       values ($1, $2, $3)`,
      [demoProfileId, sessionId, leadId],
    );
    await postgres.pool.query(
      `update users set password_hash = 'temporarily-broken' where email = $1`,
      [DEMO_EMAIL],
    );

    const service = demoService(true);
    await expect(service.execute('reset')).resolves.toMatchObject({
      command: 'reset',
    });
    await expect(service.execute('reset')).resolves.toMatchObject({
      command: 'reset',
    });

    const demoState = await postgres.pool.query<{
      click_count: string;
      faq_count: string;
      lead_count: string;
      message_count: string;
      product_count: string;
      session_count: string;
      cta_message: string;
    }>(
      `select
         b.cta_message,
         (select count(*) from products where business_profile_id = b.id)::text as product_count,
         (select count(*) from faqs where business_profile_id = b.id)::text as faq_count,
         (select count(*) from chat_sessions where business_profile_id = b.id)::text as session_count,
         (select count(*) from chat_messages m join chat_sessions s on s.id = m.chat_session_id where s.business_profile_id = b.id)::text as message_count,
         (select count(*) from leads where business_profile_id = b.id)::text as lead_count,
         (select count(*) from whatsapp_click_events where business_profile_id = b.id)::text as click_count
       from business_profiles b where b.id = $1`,
      [demoProfileId],
    );
    expect(demoState.rows[0]).toEqual({
      cta_message: DEMO_PROFILE.ctaMessage,
      product_count: String(DEMO_PRODUCTS.length),
      faq_count: String(DEMO_FAQS.length),
      session_count: '0',
      message_count: '0',
      lead_count: '0',
      click_count: '0',
    });
    const nonDemoProduct = await postgres.pool.query(
      `select id from products where id = $1`,
      [nonDemoProductId],
    );
    expect(nonDemoProduct.rowCount).toBe(1);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: DEMO_EMAIL, password: 'DemoKopiSenja2026!' })
      .expect(200);
  });
});
