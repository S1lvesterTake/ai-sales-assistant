import { NotFoundException } from '@nestjs/common';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { ChatSessionsRepository } from '../chat/chat-sessions.repository';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

const USER_ID = '019b9d80-0000-0000-0000-000000000001';
const BIZ_ID = '019b9d80-0000-0000-0000-000000000002';
const SESSION_ID = '019b9d80-0000-0000-0000-000000000003';

const owner = { userId: USER_ID, businessProfileId: BIZ_ID };

const mockSummary = {
  totalLeads: 5,
  newLeads: 3,
  conversionRate: 20,
  totalChatSessions: 10,
  whatsappClicks: 4,
};

function makeOwnership(found: typeof owner | null = owner) {
  return {
    findByUserId: jest.fn().mockResolvedValue(found),
  } as unknown as BusinessOwnershipService;
}

function makeRepo(overrides: Partial<DashboardRepository> = {}) {
  return {
    getSummary: jest.fn().mockResolvedValue(mockSummary),
    getRecentLeads: jest.fn().mockResolvedValue([]),
    getRecentConversations: jest.fn().mockResolvedValue([]),
    getTopQuestions: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as DashboardRepository;
}

function makeChatRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findByIdAndBusiness: jest.fn().mockResolvedValue(null),
    findMessagesBySession: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    }),
    ...overrides,
  } as unknown as ChatSessionsRepository;
}

describe('DashboardService', () => {
  describe('getSummary()', () => {
    it('returns the repository summary', async () => {
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(),
        makeChatRepo(),
      );
      const result = await service.getSummary(USER_ID);
      expect(result).toEqual(mockSummary);
    });

    it('throws NotFoundException when user has no business profile', async () => {
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(null),
        makeChatRepo(),
      );
      await expect(service.getSummary(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRecentLeads()', () => {
    const leadRow = {
      id: 'lead-1',
      name: 'Budi',
      phone: '6281234567890',
      status: 'new' as const,
      createdAt: new Date('2026-01-01T12:00:00Z'),
    };

    it('maps lead rows to the response shape with ISO createdAt', async () => {
      const repo = makeRepo({
        getRecentLeads: jest.fn().mockResolvedValue([leadRow]),
      });
      const service = new DashboardService(
        repo,
        makeOwnership(),
        makeChatRepo(),
      );

      const result = await service.getRecentLeads(USER_ID);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'lead-1',
        name: 'Budi',
        phone: '6281234567890',
        status: 'new',
        createdAt: '2026-01-01T12:00:00.000Z',
      });
    });

    it('passes limit to the repository', async () => {
      const getRecentLeads = jest.fn().mockResolvedValue([]);
      const repo = makeRepo({ getRecentLeads });
      const service = new DashboardService(
        repo,
        makeOwnership(),
        makeChatRepo(),
      );

      await service.getRecentLeads(USER_ID, 3);
      expect(getRecentLeads).toHaveBeenCalledWith(BIZ_ID, 3);
    });

    it('uses default limit of 5 when none supplied', async () => {
      const getRecentLeads = jest.fn().mockResolvedValue([]);
      const repo = makeRepo({ getRecentLeads });
      const service = new DashboardService(
        repo,
        makeOwnership(),
        makeChatRepo(),
      );

      await service.getRecentLeads(USER_ID);
      expect(getRecentLeads).toHaveBeenCalledWith(BIZ_ID, 5);
    });

    it('throws NotFoundException when user has no business profile', async () => {
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(null),
        makeChatRepo(),
      );
      await expect(service.getRecentLeads(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRecentConversations()', () => {
    it('maps conversation rows with ISO lastMessageAt', async () => {
      const convRow = {
        sessionId: SESSION_ID,
        customerName: 'Siti',
        lastMessage: 'Halo!',
        lastMessageAt: new Date('2026-01-02T08:00:00Z'),
      };
      const repo = makeRepo({
        getRecentConversations: jest.fn().mockResolvedValue([convRow]),
      });
      const service = new DashboardService(
        repo,
        makeOwnership(),
        makeChatRepo(),
      );

      const result = await service.getRecentConversations(USER_ID);
      expect(result.data[0]).toMatchObject({
        sessionId: SESSION_ID,
        customerName: 'Siti',
        lastMessage: 'Halo!',
        lastMessageAt: '2026-01-02T08:00:00.000Z',
      });
    });

    it('throws NotFoundException when user has no business profile', async () => {
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(null),
        makeChatRepo(),
      );
      await expect(service.getRecentConversations(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getConversationMessages()', () => {
    it('throws NotFoundException when session belongs to another business', async () => {
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(),
        makeChatRepo({
          findByIdAndBusiness: jest.fn().mockResolvedValue(null),
        }),
      );
      await expect(
        service.getConversationMessages(USER_ID, SESSION_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns paginated messages with meta block', async () => {
      const msgRow = {
        id: 'msg-1',
        role: 'customer' as const,
        message: 'Berapa harganya?',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        clientMessageId: 'client-uuid',
        replyToMessageId: null,
        processingStatus: 'completed' as const,
      };
      const chatRepo = makeChatRepo({
        findByIdAndBusiness: jest.fn().mockResolvedValue({ id: SESSION_ID }),
        findMessagesBySession: jest.fn().mockResolvedValue({
          items: [msgRow],
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        }),
      });
      const service = new DashboardService(
        makeRepo(),
        makeOwnership(),
        chatRepo,
      );

      const result = await service.getConversationMessages(USER_ID, SESSION_ID);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'msg-1',
        role: 'customer',
        message: 'Berapa harganya?',
        createdAt: '2026-01-01T10:00:00.000Z',
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
