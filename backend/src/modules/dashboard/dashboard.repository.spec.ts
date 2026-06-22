import { DatabaseService } from '../../database/database.service';
import { DashboardRepository } from './dashboard.repository';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';

function makeDb(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      as: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      $count: jest.fn().mockResolvedValue(0),
      ...overrides,
    },
  } as unknown as DatabaseService;
}

describe('DashboardRepository', () => {
  describe('getSummary()', () => {
    it('returns all-zero counts when no data exists', async () => {
      const repo = new DashboardRepository(makeDb());
      const result = await repo.getSummary(BIZ_ID);
      expect(result).toEqual({
        totalLeads: 0,
        newLeads: 0,
        conversionRate: 0,
        totalChatSessions: 0,
        whatsappClicks: 0,
      });
    });

    it('computes conversionRate as contacted/total * 100 rounded to 1 decimal', async () => {
      // $count called 5 times: totalLeads, newLeads, contactedLeads, chatSessions, waClicks
      const countMock = jest
        .fn()
        .mockResolvedValueOnce(10) // totalLeads
        .mockResolvedValueOnce(7) // newLeads
        .mockResolvedValueOnce(3) // contactedLeads
        .mockResolvedValueOnce(25) // totalChatSessions
        .mockResolvedValueOnce(8); // whatsappClicks
      const repo = new DashboardRepository(makeDb({ $count: countMock }));

      const result = await repo.getSummary(BIZ_ID);

      expect(result.totalLeads).toBe(10);
      expect(result.newLeads).toBe(7);
      expect(result.conversionRate).toBe(30); // 3/10*100 = 30.0
      expect(result.totalChatSessions).toBe(25);
      expect(result.whatsappClicks).toBe(8);
    });

    it('returns conversionRate 0 when totalLeads is 0 (avoids divide-by-zero)', async () => {
      const countMock = jest
        .fn()
        .mockResolvedValueOnce(0) // totalLeads
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      const repo = new DashboardRepository(makeDb({ $count: countMock }));

      const result = await repo.getSummary(BIZ_ID);
      expect(result.conversionRate).toBe(0);
    });

    it('rounds conversionRate to one decimal place', async () => {
      const countMock = jest
        .fn()
        .mockResolvedValueOnce(7) // totalLeads
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2) // contactedLeads → 2/7*100 = 28.571... → 28.6
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      const repo = new DashboardRepository(makeDb({ $count: countMock }));

      const result = await repo.getSummary(BIZ_ID);
      expect(result.conversionRate).toBe(28.6);
    });
  });

  describe('getRecentLeads()', () => {
    const mockLead = {
      id: 'lead-1',
      name: 'Budi',
      phone: '6281234567890',
      status: 'new',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    it('returns mapped lead rows', async () => {
      const limitMock = jest.fn().mockResolvedValue([mockLead]);
      const repo = new DashboardRepository(makeDb({ limit: limitMock }));

      const result = await repo.getRecentLeads(BIZ_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'lead-1',
        name: 'Budi',
        phone: '6281234567890',
        status: 'new',
      });
    });

    it('returns an empty array when no leads exist', async () => {
      const repo = new DashboardRepository(
        makeDb({ limit: jest.fn().mockResolvedValue([]) }),
      );
      const result = await repo.getRecentLeads(BIZ_ID);
      expect(result).toEqual([]);
    });

    it('clamps limit to MAX_WIDGET_LIMIT (20)', async () => {
      const limitMock = jest.fn().mockResolvedValue([]);
      const repo = new DashboardRepository(makeDb({ limit: limitMock }));

      await repo.getRecentLeads(BIZ_ID, 999);
      expect(limitMock).toHaveBeenCalledWith(20);
    });
  });

  describe('getTopQuestions()', () => {
    it('maps question and count from raw rows', async () => {
      const limitMock = jest
        .fn()
        .mockResolvedValue([{ question: 'Berapa harganya?', count: 5 }]);
      const repo = new DashboardRepository(makeDb({ limit: limitMock }));

      const result = await repo.getTopQuestions(BIZ_ID);
      expect(result).toEqual([{ question: 'Berapa harganya?', count: 5 }]);
    });

    it('returns an empty array when no customer messages exist', async () => {
      const repo = new DashboardRepository(
        makeDb({ limit: jest.fn().mockResolvedValue([]) }),
      );
      const result = await repo.getTopQuestions(BIZ_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentConversations()', () => {
    it('maps rows with messages correctly', async () => {
      const sessionCreatedAt = new Date('2026-01-01T00:00:00Z');
      const messageCreatedAt = new Date('2026-01-01T01:00:00Z');
      const mockRow = {
        sessionId: 'session-1',
        customerName: 'Siti',
        sessionCreatedAt,
        lastMessage: 'Halo!',
        lastMessageAt: messageCreatedAt,
      };
      const limitMock = jest.fn().mockResolvedValue([mockRow]);
      const repo = new DashboardRepository(makeDb({ limit: limitMock }));

      const result = await repo.getRecentConversations(BIZ_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sessionId: 'session-1',
        customerName: 'Siti',
        lastMessage: 'Halo!',
        lastMessageAt: messageCreatedAt,
      });
    });

    it('falls back to empty string and sessionCreatedAt when no customer message exists', async () => {
      const sessionCreatedAt = new Date('2026-01-01T00:00:00Z');
      const mockRow = {
        sessionId: 'session-2',
        customerName: null,
        sessionCreatedAt,
        lastMessage: null,
        lastMessageAt: null,
      };
      const limitMock = jest.fn().mockResolvedValue([mockRow]);
      const repo = new DashboardRepository(makeDb({ limit: limitMock }));

      const result = await repo.getRecentConversations(BIZ_ID);
      expect(result[0]?.lastMessage).toBe('');
      expect(result[0]?.lastMessageAt).toEqual(sessionCreatedAt);
    });

    it('returns an empty array when no sessions exist', async () => {
      const repo = new DashboardRepository(
        makeDb({ limit: jest.fn().mockResolvedValue([]) }),
      );
      const result = await repo.getRecentConversations(BIZ_ID);
      expect(result).toEqual([]);
    });
  });
});
