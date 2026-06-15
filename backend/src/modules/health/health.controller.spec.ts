import { DatabaseService } from '../../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a backend health snapshot', async () => {
    const database = {
      ping: jest.fn().mockResolvedValue(true),
    } as unknown as DatabaseService;
    const response = await new HealthController(database).getHealth();

    expect(response).toMatchObject({
      status: 'ok',
      database: 'up',
    });
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });

  it('reports a degraded state when PostgreSQL is unavailable', async () => {
    const database = {
      ping: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DatabaseService;

    await expect(
      new HealthController(database).getHealth(),
    ).resolves.toMatchObject({ status: 'degraded', database: 'down' });
  });
});
