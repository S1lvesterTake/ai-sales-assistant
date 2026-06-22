import { DatabaseService } from '../../database/database.service';
import { AuthRepository } from './auth.repository';

const USER_ID = '019b9d80-0000-0000-0000-000000000001';

const mockPublicUser = {
  id: USER_ID,
  name: 'Budi',
  email: 'budi@example.com',
  isDemo: false,
};

const mockStoredUser = {
  ...mockPublicUser,
  passwordHash: 'hashed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function makeDb(dbOverrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('AuthRepository', () => {
  describe('findByEmail()', () => {
    it('returns the stored user when email matches', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockStoredUser]),
      });
      const repo = new AuthRepository(database);

      const result = await repo.findByEmail('budi@example.com');

      expect(result).toEqual(mockStoredUser);
    });

    it('returns null when no user has that email', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new AuthRepository(database);

      const result = await repo.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findPublicById()', () => {
    it('returns the public user when id matches', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockPublicUser]),
      });
      const repo = new AuthRepository(database);

      const result = await repo.findPublicById(USER_ID);

      expect(result).toEqual(mockPublicUser);
    });

    it('returns null when id does not exist', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new AuthRepository(database);

      const result = await repo.findPublicById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('inserts and returns the created public user', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockPublicUser]),
      });
      const repo = new AuthRepository(database);

      const result = await repo.create({
        email: 'budi@example.com',
        name: 'Budi',
        passwordHash: 'hashed',
      });

      expect(result).toEqual(mockPublicUser);
    });

    it('throws when DB insert returns no row', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new AuthRepository(database);

      await expect(
        repo.create({ email: 'x@x.com', name: 'X', passwordHash: 'h' }),
      ).rejects.toThrow('User insert returned no row');
    });
  });
});
