import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a backend health snapshot', () => {
    const response = new HealthController().getHealth();

    expect(response).toMatchObject({
      status: 'ok',
      database: 'not_configured',
    });
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
