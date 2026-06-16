import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: config.getOrThrow<number>('DATABASE_POOL_MAX'),
      connectionTimeoutMillis: config.getOrThrow<number>(
        'DATABASE_CONNECTION_TIMEOUT_MS',
      ),
      idleTimeoutMillis: config.getOrThrow<number>('DATABASE_IDLE_TIMEOUT_MS'),
    });
    this.db = drizzle(this.pool, { schema });
  }

  async ping(): Promise<boolean> {
    const result = await this.pool.query<{ healthy: number }>(
      'select 1 as healthy',
    );
    return result.rows[0]?.healthy === 1;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
