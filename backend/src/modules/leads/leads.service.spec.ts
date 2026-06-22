import { DatabaseService } from '../../database/database.service';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { ChatSessionAuthService } from '../chat/chat-session-auth.service';
import { ChatSessionsRepository } from '../chat/chat-sessions.repository';
import type { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadRecord, LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const LEAD_ID = '019b9d80-0000-0000-0000-000000000010';

function fakeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: LEAD_ID,
    businessProfileId: BIZ_ID,
    chatSessionId: null,
    name: 'Budi Santoso',
    phone: '6281234567890',
    interestSummary: null,
    status: 'new',
    source: 'manual',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService({
  repoOverrides = {},
  ownerFound = true,
}: {
  repoOverrides?: Partial<{ [K in keyof LeadsRepository]: jest.Mock }>;
  ownerFound?: boolean;
} = {}) {
  const repository = {
    create: jest.fn().mockResolvedValue(fakeLead()),
    listByBusiness: jest.fn().mockResolvedValue({
      items: [fakeLead()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    findByIdAndBusiness: jest.fn().mockResolvedValue(fakeLead()),
    updateStatusByIdAndBusiness: jest
      .fn()
      .mockResolvedValue(fakeLead({ status: 'contacted' })),
    ...repoOverrides,
  } as unknown as jest.Mocked<LeadsRepository>;

  const ownership = {
    findByUserId: jest
      .fn()
      .mockResolvedValue(
        ownerFound ? { userId: USER_ID, businessProfileId: BIZ_ID } : null,
      ),
  } as unknown as jest.Mocked<BusinessOwnershipService>;

  const chatAuth = {
    authorize: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ChatSessionAuthService>;

  const chatSessions = {
    findByIdAndBusiness: jest.fn().mockResolvedValue({ id: 'session-1' }),
  } as unknown as jest.Mocked<ChatSessionsRepository>;

  return {
    repository,
    ownership,
    chatAuth,
    chatSessions,
    service: new LeadsService(
      repository,
      ownership,
      chatAuth,
      chatSessions,
      null as unknown as DatabaseService, // not used in these test paths
    ),
  };
}

describe('LeadsService', () => {
  describe('list()', () => {
    it('scopes results to the caller businessProfileId and returns data + meta', async () => {
      const { repository, service } = makeService();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { listByBusiness } = repository;

      const result = await service.list(USER_ID, { page: 1, limit: 20 });

      expect(listByBusiness).toHaveBeenCalledWith(BIZ_ID, expect.anything());
      expect(result).toMatchObject({
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.any(Array),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        meta: expect.objectContaining({ page: 1, limit: 20, total: 1 }),
      });
    });

    it('throws 404 when the caller has no business profile', async () => {
      const { service } = makeService({ ownerFound: false });

      await expect(service.list(USER_ID, {})).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('get()', () => {
    it('returns the lead when it belongs to the caller business', async () => {
      const { service } = makeService();

      const result = await service.get(USER_ID, LEAD_ID);

      expect(result).toMatchObject({ id: LEAD_ID, phone: '6281234567890' });
    });

    it('throws 404 when the lead does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          findByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.get(USER_ID, LEAD_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('updateStatus()', () => {
    it('updates the lead status scoped to businessProfileId', async () => {
      const { repository, service } = makeService();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { updateStatusByIdAndBusiness } = repository;

      const result = await service.updateStatus(USER_ID, LEAD_ID, {
        status: 'contacted',
      } as unknown as UpdateLeadStatusDto);

      expect(updateStatusByIdAndBusiness).toHaveBeenCalledWith(
        LEAD_ID,
        BIZ_ID,
        'contacted',
      );
      expect(result.status).toBe('contacted');
    });

    it('throws 404 when the lead does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          updateStatusByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(
        service.updateStatus(USER_ID, LEAD_ID, {
          status: 'contacted',
        } as unknown as UpdateLeadStatusDto),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('createViaJwt()', () => {
    it('normalizes 08xx phone to 62xx before persisting', async () => {
      const { repository, service } = makeService({
        repoOverrides: {
          create: jest
            .fn()
            .mockResolvedValue(fakeLead({ phone: '62812345678' })),
        },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { create } = repository;

      await service.createViaJwt(USER_ID, {
        phone: '0812345678',
        name: 'Budi',
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '62812345678' }),
      );
    });

    it('normalizes +628xx phone (strips the + prefix)', async () => {
      const { repository, service } = makeService({
        repoOverrides: {
          create: jest
            .fn()
            .mockResolvedValue(fakeLead({ phone: '6281234567890' })),
        },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { create: create2 } = repository;

      await service.createViaJwt(USER_ID, {
        phone: '+6281234567890',
        name: 'Siti',
      });

      expect(create2).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '6281234567890' }),
      );
    });

    it('scopes the new lead to the caller businessProfileId', async () => {
      const { repository, service } = makeService();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { create: create3 } = repository;

      await service.createViaJwt(USER_ID, {
        phone: '6281234567890',
        name: 'Andi',
      });

      expect(create3).toHaveBeenCalledWith(
        expect.objectContaining({ businessProfileId: BIZ_ID }),
      );
    });

    it('throws 409 when a lead with the same phone already exists', async () => {
      const { service } = makeService({
        repoOverrides: {
          create: jest.fn().mockRejectedValue({ cause: { code: '23505' } }),
        },
      });

      await expect(
        service.createViaJwt(USER_ID, { phone: '6281234567890', name: 'Andi' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('throws 422 for a phone number that is not a valid Indonesian format', async () => {
      const { service } = makeService();

      await expect(
        service.createViaJwt(USER_ID, { phone: '123456789', name: 'Andi' }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('throws 404 when the caller has no business profile', async () => {
      const { service } = makeService({ ownerFound: false });

      await expect(
        service.createViaJwt(USER_ID, { phone: '6281234567890' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
