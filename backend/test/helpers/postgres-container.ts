import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool } from 'pg';

const execFileAsync = promisify(execFile);

export interface DisposablePostgres {
  connectionUri: string;
  pool: Pool;
  stop: () => Promise<void>;
}

export async function startDisposablePostgres(): Promise<DisposablePostgres> {
  const name = `ai-sales-backend-test-${randomUUID()}`;
  await execFileAsync('docker', [
    'run',
    '--rm',
    '-d',
    '--name',
    name,
    '-e',
    'POSTGRES_DB=ai_sales_assistant_test',
    '-e',
    'POSTGRES_USER=test',
    '-e',
    'POSTGRES_PASSWORD=test',
    '-P',
    'postgres:16-alpine',
  ]);
  const { stdout } = await execFileAsync('docker', ['port', name, '5432/tcp']);
  const port = stdout.match(/:(\d+)\s*$/m)?.[1];
  if (!port) throw new Error('Unable to resolve disposable PostgreSQL port');
  const connectionUri = `postgresql://test:test@127.0.0.1:${port}/ai_sales_assistant_test`;
  const pool = new Pool({ connectionString: connectionUri });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await pool.query('select 1');
      return {
        connectionUri,
        pool,
        stop: async () => {
          await pool.end();
          await execFileAsync('docker', ['rm', '-f', name]);
        },
      };
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  await pool.end();
  await execFileAsync('docker', ['rm', '-f', name]);
  throw new Error('Disposable PostgreSQL did not become ready');
}
