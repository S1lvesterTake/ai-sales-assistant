import { DatabaseService } from '../../database/database.service';
import { ChatSessionsRepository } from './chat-sessions.repository';

const SESSION_ID = '019b9d80-0000-0000-0000-000000000001';
const BIZ_ID = '019b9d80-0000-0000-0000-000000000002';

const mockSession = {
  id: SESSION_ID,
  businessProfileId: BIZ_ID,
  accessTokenHash: 'hash',
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  customerName: 'Budi',
  customerPhone: '6281234567890',
  source: 'web' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockMessage = {
  id: 'msg-1',
  chatSessionId: SESSION_ID,
  role: 'customer' as const,
  message: 'Halo!',
  clientMessageId: null,
  replyToMessageId: null,
  processingStatus: 'completed' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function makeDb(dbOverrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      $count: jest.fn().mockResolvedValue(0),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('ChatSessionsRepository', () => {
  describe('create()', () => {
    it('inserts and returns the created session', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockSession]),
      });
      const repo = new ChatSessionsRepository(database);

      const result = await repo.create({
        businessProfileId: BIZ_ID,
        accessTokenHash: 'hash',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
        customerName: null,
        customerPhone: null,
        source: 'web',
      });

      expect(result).toEqual(mockSession);
    });

    it('throws when DB insert returns no row', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new ChatSessionsRepository(database);

      await expect(
        repo.create({
          businessProfileId: BIZ_ID,
          accessTokenHash: 'h',
          expiresAt: new Date(),
          customerName: null,
          customerPhone: null,
          source: 'web',
        }),
      ).rejects.toThrow('Chat session insert returned no row');
    });
  });

  describe('findByIdAndBusiness()', () => {
    it('returns the session when id and businessProfileId match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockSession]),
      });
      const repo = new ChatSessionsRepository(database);

      const result = await repo.findByIdAndBusiness(SESSION_ID, BIZ_ID);

      expect(result).toEqual(mockSession);
    });

    it('returns null when session does not exist for that business', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new ChatSessionsRepository(database);

      const result = await repo.findByIdAndBusiness('unknown', BIZ_ID);

      expect(result).toBeNull();
    });
  });

  describe('findMessagesBySession()', () => {
    it('returns paginated messages with correct metadata', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([mockMessage]),
        $count: jest.fn().mockResolvedValue(1),
      });
      const repo = new ChatSessionsRepository(database);

      const result = await repo.findMessagesBySession(
        SESSION_ID,
        BIZ_ID,
        1,
        20,
      );

      expect(result.items).toEqual([mockMessage]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('computes totalPages correctly across multiple pages', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([]),
        $count: jest.fn().mockResolvedValue(25),
      });
      const repo = new ChatSessionsRepository(database);

      const result = await repo.findMessagesBySession(
        SESSION_ID,
        BIZ_ID,
        1,
        10,
      );

      expect(result.totalPages).toBe(3);
    });
  });
});
