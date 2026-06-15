import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { DatabaseService } from '../src/database/database.service';
import {
  DisposablePostgres,
  startDisposablePostgres,
} from './helpers/postgres-container';

async function expectPgCode(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected PostgreSQL error ${expectedCode}`);
  } catch (error) {
    expect(error).toMatchObject({ code: expectedCode });
  }
}

describe('PostgreSQL schema and migrations', () => {
  let container: DisposablePostgres;
  let connectionUri: string;
  let pool: Pool;

  beforeAll(async () => {
    container = await startDisposablePostgres();
    connectionUri = container.connectionUri;
    pool = container.pool;
    const database = drizzle(pool);
    const migrationsFolder = resolve(__dirname, '../src/database/migrations');
    await migrate(database, { migrationsFolder });
    await migrate(database, { migrationsFolder });
  });

  afterAll(async () => {
    if (container) await container.stop();
  });

  it('creates every table and required index from an empty database', async () => {
    const tables = await pool.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `);
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'business_profiles',
      'chat_messages',
      'chat_sessions',
      'error_logs',
      'faqs',
      'leads',
      'products',
      'users',
      'whatsapp_click_events',
    ]);

    const indexes = await pool.query<{ indexname: string }>(`
      select indexname from pg_indexes where schemaname = 'public'
    `);
    const indexNames = indexes.rows.map((row) => row.indexname);
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'business_profiles_slug_unique',
        'business_profiles_user_id_unique',
        'leads_business_phone_unique',
        'chat_messages_session_client_message_unique',
        'chat_messages_reply_to_unique',
        'leads_business_status_created_id_idx',
        'chat_messages_session_created_id_idx',
        'products_business_available_created_id_idx',
        'faqs_business_active_created_id_idx',
        'whatsapp_events_business_clicked_id_idx',
      ]),
    );
  });

  it('connects through DatabaseService and closes its pool', async () => {
    const configValues: Record<string, number | string> = {
      DATABASE_URL: connectionUri,
      DATABASE_POOL_MAX: 2,
      DATABASE_CONNECTION_TIMEOUT_MS: 5_000,
      DATABASE_IDLE_TIMEOUT_MS: 5_000,
    };
    const config = {
      getOrThrow: <T>(key: string): T => configValues[key] as T,
    } as unknown as ConfigService;
    const database = new DatabaseService(config);

    await expect(database.ping()).resolves.toBe(true);
    await database.onApplicationShutdown();
    await expect(database.pool.query('select 1')).rejects.toThrow();
  });

  it('enforces ownership identity, canonical fields, and price constraints', async () => {
    const userId = randomUUID();
    await pool.query(
      `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
      [userId, 'Owner', 'owner@example.com', 'hashed'],
    );
    const businessId = randomUUID();
    await pool.query(
      `insert into business_profiles
        (id, user_id, slug, business_name, whatsapp_number)
       values ($1, $2, $3, $4, $5)`,
      [businessId, userId, 'kopi-senja', 'Kopi Senja', '6281234567890'],
    );

    await expectPgCode(
      pool.query(
        `insert into business_profiles
          (user_id, slug, business_name, whatsapp_number)
         values ($1, $2, $3, $4)`,
        [userId, 'second-business', 'Second', '6281234567891'],
      ),
      '23505',
    );
    await expectPgCode(
      pool.query(
        `insert into business_profiles
          (user_id, slug, business_name, whatsapp_number)
         values ($1, $2, $3, $4)`,
        [randomUUID(), 'Invalid Slug', 'Invalid', '081234'],
      ),
      '23514',
    );
    await expectPgCode(
      pool.query(
        `insert into products (business_profile_id, name, price)
         values ($1, $2, $3)`,
        [businessId, 'Invalid Product', -1],
      ),
      '23514',
    );
    await expectPgCode(
      pool.query(`delete from users where id = $1`, [userId]),
      '23503',
    );
  });

  it('enforces lead uniqueness and chat idempotency constraints', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    await pool.query(
      `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
      [userId, 'Chat Owner', `${userId}@example.com`, 'hashed'],
    );
    await pool.query(
      `insert into business_profiles
        (id, user_id, slug, business_name, whatsapp_number)
       values ($1, $2, $3, $4, $5)`,
      [businessId, userId, `business-${userId}`, 'Business', '6281234567892'],
    );
    const firstSession = randomUUID();
    const secondSession = randomUUID();
    for (const sessionId of [firstSession, secondSession]) {
      await pool.query(
        `insert into chat_sessions
          (id, business_profile_id, access_token_hash, expires_at)
         values ($1, $2, $3, now() + interval '1 hour')`,
        [sessionId, businessId, `hash-${sessionId}`],
      );
    }

    const clientMessageId = randomUUID();
    const customerMessageId = randomUUID();
    await pool.query(
      `insert into chat_messages
        (id, chat_session_id, client_message_id, processing_status, role, message)
       values ($1, $2, $3, 'pending', 'customer', $4)`,
      [customerMessageId, firstSession, clientMessageId, 'Halo'],
    );
    await expectPgCode(
      pool.query(
        `insert into chat_messages
          (chat_session_id, client_message_id, processing_status, role, message)
         values ($1, $2, 'pending', 'customer', $3)`,
        [firstSession, clientMessageId, 'Duplicate'],
      ),
      '23505',
    );
    await pool.query(
      `insert into chat_messages
        (chat_session_id, client_message_id, processing_status, role, message)
       values ($1, $2, 'pending', 'customer', $3)`,
      [secondSession, clientMessageId, 'Allowed in another session'],
    );

    await pool.query(
      `insert into chat_messages
        (chat_session_id, reply_to_message_id, role, message)
       values ($1, $2, 'assistant', $3)`,
      [firstSession, customerMessageId, 'Jawaban'],
    );
    await expectPgCode(
      pool.query(
        `insert into chat_messages
          (chat_session_id, reply_to_message_id, role, message)
         values ($1, $2, 'assistant', $3)`,
        [firstSession, customerMessageId, 'Second answer'],
      ),
      '23505',
    );
    const otherCustomerMessageId = randomUUID();
    await pool.query(
      `insert into chat_messages
        (id, chat_session_id, client_message_id, processing_status, role, message)
       values ($1, $2, $3, 'pending', 'customer', $4)`,
      [otherCustomerMessageId, firstSession, randomUUID(), 'Other'],
    );
    await expectPgCode(
      pool.query(
        `insert into chat_messages
          (chat_session_id, reply_to_message_id, role, message)
         values ($1, $2, 'assistant', $3)`,
        [secondSession, otherCustomerMessageId, 'Cross-session answer'],
      ),
      '23503',
    );

    await pool.query(
      `insert into leads (business_profile_id, chat_session_id, phone)
       values ($1, $2, $3)`,
      [businessId, firstSession, '6281234567000'],
    );
    await expectPgCode(
      pool.query(
        `insert into leads (business_profile_id, phone) values ($1, $2)`,
        [businessId, '6281234567000'],
      ),
      '23505',
    );
    await expectPgCode(
      pool.query(
        `insert into leads (business_profile_id, phone) values ($1, $2)`,
        [businessId, '08123'],
      ),
      '23514',
    );
  });

  it('applies cascade and set-null deletion behavior explicitly', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const sessionId = randomUUID();
    await pool.query(
      `insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)`,
      [userId, 'Delete Owner', `${userId}@example.com`, 'hashed'],
    );
    await pool.query(
      `insert into business_profiles
        (id, user_id, slug, business_name, whatsapp_number)
       values ($1, $2, $3, $4, $5)`,
      [businessId, userId, `delete-${userId}`, 'Delete', '6281234567893'],
    );
    await pool.query(
      `insert into chat_sessions
        (id, business_profile_id, access_token_hash, expires_at)
       values ($1, $2, $3, now() + interval '1 hour')`,
      [sessionId, businessId, 'hash'],
    );
    await pool.query(
      `insert into chat_messages
        (chat_session_id, client_message_id, processing_status, role, message)
       values ($1, $2, 'pending', 'customer', 'Message')`,
      [sessionId, randomUUID()],
    );
    const lead = await pool.query<{ id: string }>(
      `insert into leads (business_profile_id, chat_session_id, phone)
       values ($1, $2, $3) returning id`,
      [businessId, sessionId, '6281234567001'],
    );
    await pool.query(
      `insert into whatsapp_click_events
        (business_profile_id, chat_session_id, lead_id)
       values ($1, $2, $3)`,
      [businessId, sessionId, lead.rows[0]?.id],
    );

    await pool.query(`delete from chat_sessions where id = $1`, [sessionId]);

    const messages = await pool.query(
      `select id from chat_messages where chat_session_id = $1`,
      [sessionId],
    );
    const storedLead = await pool.query<{ chat_session_id: string | null }>(
      `select chat_session_id from leads where id = $1`,
      [lead.rows[0]?.id],
    );
    const event = await pool.query<{ chat_session_id: string | null }>(
      `select chat_session_id from whatsapp_click_events where lead_id = $1`,
      [lead.rows[0]?.id],
    );
    expect(messages.rowCount).toBe(0);
    expect(storedLead.rows[0]?.chat_session_id).toBeNull();
    expect(event.rows[0]?.chat_session_id).toBeNull();
  });
});
