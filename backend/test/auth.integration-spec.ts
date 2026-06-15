import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import { App } from 'supertest/types';
import { BusinessOwnershipService } from '../src/common/ownership/business-ownership.service';
import { configureApplication } from '../src/configure-application';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import {
  DisposablePostgres,
  startDisposablePostgres,
} from './helpers/postgres-container';

describe('Authentication and ownership API', () => {
  let app: INestApplication<App>;
  let postgres: DisposablePostgres;

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
  });

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
  });

  it('registers, hashes the password, logs in, and returns the current user', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Budi Santoso',
        email: 'BUDI@example.com',
        password: 'Password123',
      })
      .expect(201);
    expect(registration.body).toMatchObject({
      success: true,
      data: {
        user: {
          name: 'Budi Santoso',
          email: 'budi@example.com',
          isDemo: false,
        },
      },
    });
    expect(registration.text).not.toContain('passwordHash');
    expect(registration.text).not.toContain('Password123');

    const stored = await postgres.pool.query<{
      id: string;
      password_hash: string;
    }>(`select id, password_hash from users where email = $1`, [
      'budi@example.com',
    ]);
    expect(stored.rows[0]?.password_hash).not.toBe('Password123');
    await expect(
      bcrypt.compare('Password123', stored.rows[0]?.password_hash ?? ''),
    ).resolves.toBe(true);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'BUDI@EXAMPLE.COM', password: 'Password123' })
      .expect(200);
    const accessToken = login.text.match(/"accessToken":"([^"]+)"/)?.[1];
    expect(accessToken).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          data: { id: stored.rows[0]?.id, email: 'budi@example.com' },
        });
      });
  });

  it('rejects duplicate registration and protected demo or ownership fields', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Duplicate',
        email: 'budi@example.com',
        password: 'Password123',
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Injected',
        email: 'injected@example.com',
        password: 'Password123',
        isDemo: true,
        userId: randomUUID(),
        businessProfileId: randomUUID(),
      })
      .expect(422);
    const injected = await postgres.pool.query(
      `select id from users where email = 'injected@example.com'`,
    );
    expect(injected.rowCount).toBe(0);
  });

  it.each([
    {
      label: 'invalid email',
      payload: {
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'Password123',
      },
    },
    {
      label: 'weak password',
      payload: {
        name: 'Weak Password',
        email: 'weak@example.com',
        password: 'password',
      },
    },
    {
      label: 'oversized name',
      payload: {
        name: 'A'.repeat(101),
        email: 'oversized-name@example.com',
        password: 'Password123',
      },
    },
    {
      label: 'oversized password',
      payload: {
        name: 'Oversized Password',
        email: 'oversized-password@example.com',
        password: `Password123${'A'.repeat(190)}`,
      },
    },
  ])('rejects $label during registration', async ({ payload }) => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .expect(422);
  });

  it('uses generic credential errors and rejects invalid JWTs', async () => {
    for (const credentials of [
      { email: 'budi@example.com', password: 'WrongPassword123' },
      { email: 'unknown@example.com', password: 'WrongPassword123' },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Email atau kata sandi salah',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer malformed-token')
      .expect(401);
    const missingSubject = await app
      .get(JwtService)
      .signAsync({ email: 'budi@example.com', isDemo: false });
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${missingSubject}`)
      .expect(401);
    const user = await postgres.pool.query<{ id: string }>(
      `select id from users where email = 'budi@example.com'`,
    );
    const expired = await app
      .get(JwtService)
      .signAsync(
        { email: 'budi@example.com', isDemo: false },
        { subject: user.rows[0]?.id, expiresIn: -1 },
      );
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('resolves each business strictly from the authenticated user ID', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Owner Two',
        email: 'owner-two@example.com',
        password: 'Password123',
      })
      .expect(201);
    const users = await postgres.pool.query<{ email: string; id: string }>(
      `select id, email from users where email in ($1, $2) order by email`,
      ['budi@example.com', 'owner-two@example.com'],
    );
    const profileByUser = new Map<string, string>();
    for (const user of users.rows) {
      const profileId = randomUUID();
      profileByUser.set(user.id, profileId);
      await postgres.pool.query(
        `insert into business_profiles
          (id, user_id, slug, business_name, whatsapp_number)
         values ($1, $2, $3, $4, $5)`,
        [
          profileId,
          user.id,
          `profile-${profileId}`,
          user.email,
          '6281234567890',
        ],
      );
    }

    const ownership = app.get(BusinessOwnershipService);
    for (const user of users.rows) {
      await expect(ownership.findByUserId(user.id)).resolves.toEqual({
        userId: user.id,
        businessProfileId: profileByUser.get(user.id),
      });
    }
    await expect(ownership.findByUserId(randomUUID())).resolves.toBeNull();
  });
});
