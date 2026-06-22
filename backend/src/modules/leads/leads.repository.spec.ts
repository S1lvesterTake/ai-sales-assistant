import { DatabaseService } from '../../database/database.service';
import { LeadsRepository } from './leads.repository';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const OTHER_BIZ = '019b9d80-0000-0000-0000-000000000002';
const LEAD_ID = '019b9d80-0000-0000-0000-000000000010';

const mockLead = {
  id: LEAD_ID,
  businessProfileId: BIZ_ID,
  chatSessionId: null,
  name: 'Budi Santoso',
  phone: '6281234567890',
  interestSummary: null,
  status: 'new' as const,
  source: 'manual',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const createInput = {
  businessProfileId: BIZ_ID,
  chatSessionId: null,
  name: 'Budi Santoso',
  phone: '6281234567890',
  interestSummary: null,
  source: 'manual',
  status: 'new' as const,
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
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      $count: jest.fn().mockResolvedValue(0),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('LeadsRepository', () => {
  describe('create()', () => {
    it('inserts and returns the created lead', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockLead]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.create(createInput);

      expect(result).toEqual(mockLead);
    });

    it('throws when the DB insert returns no row', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new LeadsRepository(database);

      await expect(repo.create(createInput)).rejects.toThrow(
        'Lead insert returned no row',
      );
    });
  });

  describe('findByIdAndBusiness()', () => {
    it('returns the lead when id and businessProfileId both match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockLead]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.findByIdAndBusiness(LEAD_ID, BIZ_ID);

      expect(result).toEqual(mockLead);
    });

    it('returns null when the id does not exist', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.findByIdAndBusiness('nonexistent', BIZ_ID);

      expect(result).toBeNull();
    });

    it('returns null when businessProfileId does not match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.findByIdAndBusiness(LEAD_ID, OTHER_BIZ);

      expect(result).toBeNull();
    });
  });

  describe('listByBusiness()', () => {
    it('returns paginated leads scoped to businessProfileId', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([mockLead]),
        $count: jest.fn().mockResolvedValue(1),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { page: 1, limit: 20 });

      expect(result.items).toEqual([mockLead]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('applies default page and limit when no options are given', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([]),
        $count: jest.fn().mockResolvedValue(0),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('updateStatusByIdAndBusiness()', () => {
    it('returns the lead with updated status when found', async () => {
      const updated = { ...mockLead, status: 'contacted' as const };
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([updated]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.updateStatusByIdAndBusiness(
        LEAD_ID,
        BIZ_ID,
        'contacted',
      );

      expect(result?.status).toBe('contacted');
    });

    it('returns null when id does not exist or businessProfileId does not match', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new LeadsRepository(database);

      const result = await repo.updateStatusByIdAndBusiness(
        LEAD_ID,
        OTHER_BIZ,
        'contacted',
      );

      expect(result).toBeNull();
    });
  });
});
