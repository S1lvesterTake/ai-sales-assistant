import { DatabaseService } from '../../database/database.service';
import { ErrorLogService } from './error-log.service';

describe('ErrorLogService', () => {
  it('never propagates a supplemental database logging failure', async () => {
    const values = jest.fn().mockRejectedValue(new Error('database down'));
    const database = {
      db: { insert: jest.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService;

    await expect(
      new ErrorLogService(database).capture({
        source: 'http',
        message: 'safe message',
        metadata: { code: 'INTERNAL_ERROR' },
      }),
    ).resolves.toBeUndefined();
  });
});
