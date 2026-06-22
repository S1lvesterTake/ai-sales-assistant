import { DatabaseService } from '../../database/database.service';
import { ProductsRepository } from './products.repository';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const OTHER_BIZ = '019b9d80-0000-0000-0000-000000000002';
const PRODUCT_ID = '019b9d80-0000-0000-0000-000000000010';

const mockProduct = {
  id: PRODUCT_ID,
  businessProfileId: BIZ_ID,
  name: 'Kopi Susu',
  description: null,
  price: 18_000,
  category: 'Kopi',
  isAvailable: true,
  orderingInstruction: null,
  additionalNotes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const createInput = {
  businessProfileId: BIZ_ID,
  name: 'Kopi Susu',
  description: null,
  price: 18_000,
  category: 'Kopi',
  isAvailable: true,
  orderingInstruction: null,
  additionalNotes: null,
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

describe('ProductsRepository', () => {
  describe('create()', () => {
    it('inserts and returns the created product', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockProduct]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.create(createInput);

      expect(result).toEqual(mockProduct);
    });

    it('throws when the DB insert returns no row', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new ProductsRepository(database);

      await expect(repo.create(createInput)).rejects.toThrow(
        'Product insert returned no row',
      );
    });
  });

  describe('findByIdAndBusiness()', () => {
    it('returns the product when id and businessProfileId both match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockProduct]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.findByIdAndBusiness(PRODUCT_ID, BIZ_ID);

      expect(result).toEqual(mockProduct);
    });

    it('returns null when the id does not exist', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.findByIdAndBusiness('nonexistent', BIZ_ID);

      expect(result).toBeNull();
    });

    it('returns null when businessProfileId does not match', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.findByIdAndBusiness(PRODUCT_ID, OTHER_BIZ);

      expect(result).toBeNull();
    });
  });

  describe('listByBusiness()', () => {
    it('returns paginated products scoped to businessProfileId', async () => {
      const database = makeDb({
        offset: jest.fn().mockResolvedValue([mockProduct]),
        $count: jest.fn().mockResolvedValue(1),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { page: 1, limit: 20 });

      expect(result.items).toEqual([mockProduct]);
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
      const repo = new ProductsRepository(database);

      const result = await repo.listByBusiness(BIZ_ID, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3); // ceil(45/20)
    });
  });

  describe('updateByIdAndBusiness()', () => {
    it('returns the updated product when found', async () => {
      const updated = { ...mockProduct, name: 'Kopi Hitam', price: 12_000 };
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([updated]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.updateByIdAndBusiness(PRODUCT_ID, BIZ_ID, {
        name: 'Kopi Hitam',
        price: 12_000,
      });

      expect(result).toEqual(updated);
    });

    it('returns null when id does not exist or businessProfileId does not match', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.updateByIdAndBusiness(PRODUCT_ID, OTHER_BIZ, {
        name: 'Kopi Hitam',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteByIdAndBusiness()', () => {
    it('returns true when the product is found and deleted', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([{ id: PRODUCT_ID }]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.deleteByIdAndBusiness(PRODUCT_ID, BIZ_ID);

      expect(result).toBe(true);
    });

    it('returns false when id does not exist or businessProfileId does not match', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new ProductsRepository(database);

      const result = await repo.deleteByIdAndBusiness(PRODUCT_ID, OTHER_BIZ);

      expect(result).toBe(false);
    });
  });
});
