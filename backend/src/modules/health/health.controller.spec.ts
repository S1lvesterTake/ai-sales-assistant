import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a backend health snapshot', () => {
    const response = new HealthController().getHealth();

    expect(response).toMatchObject({
      success: true,
      message: 'Service is healthy',
      data: { status: 'ok', database: 'not_configured' },
    });
    expect(Number.isNaN(Date.parse(response.data.timestamp))).toBe(false);
  });
});
