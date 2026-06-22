import { DatabaseService } from '../../database/database.service';
import { BusinessOwnershipService } from './business-ownership.service';

const USER_ID = '019b9d80-0000-0000-0000-000000000001';
const BIZ_ID = '019b9d80-0000-0000-0000-000000000002';

function makeDb(dbOverrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('BusinessOwnershipService', () => {
  it('returns the ownership record when user has a business profile', async () => {
    const ownership = { businessProfileId: BIZ_ID, userId: USER_ID };
    const database = makeDb({
      limit: jest.fn().mockResolvedValue([ownership]),
    });
    const service = new BusinessOwnershipService(database);

    const result = await service.findByUserId(USER_ID);

    expect(result).toEqual(ownership);
  });

  it('returns null when user has no business profile', async () => {
    const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
    const service = new BusinessOwnershipService(database);

    const result = await service.findByUserId('unknown-user');

    expect(result).toBeNull();
  });
});
