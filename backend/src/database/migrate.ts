import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, './migrations'),
    });
    process.stdout.write('Migrations complete\n');
  } finally {
    await pool.end();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Migration failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
