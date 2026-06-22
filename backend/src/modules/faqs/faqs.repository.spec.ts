import { DatabaseService } from '../../database/database.service';
import { FaqsRepository } from './faqs.repository';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const OTHER_BIZ = '019b9d80-0000-0000-0000-000000000002';
const FAQ_ID = '019b9d80-0000-0000-0000-000000000010';

const mockFaq = {
  id: FAQ_ID,
  businessProfileId: BIZ_ID,
  question: 'Apakah bisa pesan untuk acara?',
  answer: 'Bisa.',
  category: 'Pemesanan',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const createInput = {
  businessProfileId: BIZ_ID,
  question: 'Apakah bisa pesan untuk acara?',
  answer: 'Bisa.',
  category: 'Pemesanan' as string | null,
  isActive: true,
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
      delete: jest.fn().mockReturnThis(),
      $count: jest.fn().mockResolvedValue(0),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('FaqsRepository', () => {
  describe('create()', () => {
    it('inserts and returns the created FAQ', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockFaq]),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.create(createInput);

      expect(result).toEqual(mockFaq);
    });

    it('throws when the DB insert returns no row', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new FaqsRepository(database);

      await expect(repo.create(createInput)).rejects.toThrow(
        'FAQ insert returned no row',
      );
    });
  });

  describe('findByIdAndBusiness()', () => {
    it('returns the FAQ when id and businessProfileId both match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockFaq]),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.findByIdAndBusiness(FAQ_ID, BIZ_ID);

      expect(result).toEqual(mockFaq);
    });

    it('returns null when the id does not exist', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new FaqsRepository(database);

      const result = await repo.findByIdAndBusiness('nonexistent', BIZ_ID);

      expect(result).toBeNull();
    });

    it('returns null when businessProfileId does not match', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new FaqsRepository(database);

      const result = await repo.findByIdAndBusiness(FAQ_ID, OTHER_BIZ);

      expect(result).toBeNull();
    });
  });

  describe('listByBusiness()', () => {
    it('returns paginated FAQs scoped to businessProfileId', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([mockFaq]),
        $count: jest.fn().mockResolvedValue(1),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { page: 1, limit: 20 });

      expect(result.items).toEqual([mockFaq]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('computes totalPages correctly when total exceeds limit', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([]),
        $count: jest.fn().mockResolvedValue(45),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });

    it('applies search filter when search option is provided', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([mockFaq]),
        $count: jest.fn().mockResolvedValue(1),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { search: 'acara' });

      expect(result.items).toHaveLength(1);
    });

    it('uses defaults when no options provided', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([]),
        $count: jest.fn().mockResolvedValue(0),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('updateByIdAndBusiness()', () => {
    it('returns the updated FAQ when found', async () => {
      const updated = { ...mockFaq, answer: 'Updated answer.' };
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([updated]),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.updateByIdAndBusiness(FAQ_ID, BIZ_ID, {
        answer: 'Updated answer.',
      });

      expect(result).toEqual(updated);
    });

    it('returns null when id does not exist or businessProfileId does not match', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new FaqsRepository(database);

      const result = await repo.updateByIdAndBusiness(FAQ_ID, OTHER_BIZ, {
        answer: 'Updated.',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteByIdAndBusiness()', () => {
    it('returns true when the FAQ is found and deleted', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([{ id: FAQ_ID }]),
      });
      const repo = new FaqsRepository(database);

      const result = await repo.deleteByIdAndBusiness(FAQ_ID, BIZ_ID);

      expect(result).toBe(true);
    });

    it('returns false when id does not exist or businessProfileId does not match', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new FaqsRepository(database);

      const result = await repo.deleteByIdAndBusiness(FAQ_ID, OTHER_BIZ);

      expect(result).toBe(false);
    });
  });
});
