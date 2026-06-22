import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRecord, ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const PRODUCT_ID = '019b9d80-0000-0000-0000-000000000010';

function fakeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
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
    ...overrides,
  };
}

function makeService({
  repoOverrides = {},
  ownerFound = true,
}: {
  repoOverrides?: Partial<{
    [K in keyof ProductsRepository]: jest.Mock;
  }>;
  ownerFound?: boolean;
} = {}) {
  const repository = {
    create: jest.fn().mockResolvedValue(fakeProduct()),
    findByIdAndBusiness: jest.fn().mockResolvedValue(fakeProduct()),
    listByBusiness: jest.fn().mockResolvedValue({
      items: [fakeProduct()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    updateByIdAndBusiness: jest.fn().mockResolvedValue(fakeProduct()),
    deleteByIdAndBusiness: jest.fn().mockResolvedValue(true),
    ...repoOverrides,
  } as unknown as jest.Mocked<ProductsRepository>;

  const ownership = {
    findByUserId: jest
      .fn()
      .mockResolvedValue(
        ownerFound ? { userId: USER_ID, businessProfileId: BIZ_ID } : null,
      ),
  } as unknown as jest.Mocked<BusinessOwnershipService>;

  return {
    repository,
    ownership,
    service: new ProductsService(repository, ownership),
  };
}

describe('ProductsService', () => {
  describe('create()', () => {
    it('scopes the new product to the caller businessProfileId', async () => {
      const { repository, service } = makeService();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { create } = repository;
      const result = await service.create(USER_ID, {
        name: 'Kopi Susu',
        price: 18_000,
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ businessProfileId: BIZ_ID }),
      );
      expect(result).toMatchObject({ name: 'Kopi Susu', price: 18_000 });
    });

    it('throws 404 when the caller has no business profile', async () => {
      const { service } = makeService({ ownerFound: false });

      await expect(
        service.create(USER_ID, { name: 'Kopi Susu', price: 18_000 }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('get()', () => {
    it('returns the product when it belongs to the caller business', async () => {
      const { service } = makeService();

      const result = await service.get(USER_ID, PRODUCT_ID);

      expect(result).toMatchObject({ id: PRODUCT_ID, name: 'Kopi Susu' });
    });

    it('throws 404 when the product does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          findByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.get(USER_ID, PRODUCT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws 404 for a product that belongs to a different business', async () => {
      // Repository enforces the AND filter — returns null for cross-owner IDs
      const { service, repository } = makeService({
        repoOverrides: {
          findByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { findByIdAndBusiness } = repository;
      await expect(service.get(USER_ID, PRODUCT_ID)).rejects.toMatchObject({
        status: 404,
      });
      expect(findByIdAndBusiness).toHaveBeenCalledWith(PRODUCT_ID, BIZ_ID);
    });
  });

  describe('list()', () => {
    it('queries exclusively by businessProfileId and returns data + meta', async () => {
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

    it('returns an empty array and zero total when the business has no products', async () => {
      const { service } = makeService({
        repoOverrides: {
          listByBusiness: jest.fn().mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          }),
        },
      });

      const result = await service.list(USER_ID, {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('update()', () => {
    it('builds the update scoped to businessProfileId and returns the updated product', async () => {
      const updated = fakeProduct({ name: 'Updated Name', price: 25_000 });
      const { repository, service } = makeService({
        repoOverrides: {
          updateByIdAndBusiness: jest.fn().mockResolvedValue(updated),
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { updateByIdAndBusiness } = repository;

      const result = await service.update(USER_ID, PRODUCT_ID, {
        name: 'Updated Name',
        price: 25_000,
      });

      expect(updateByIdAndBusiness).toHaveBeenCalledWith(
        PRODUCT_ID,
        BIZ_ID,
        expect.objectContaining({ name: 'Updated Name', price: 25_000 }),
      );
      expect(result.name).toBe('Updated Name');
    });

    it('throws 422 when the request body provides no recognizable fields', async () => {
      const { service } = makeService();

      await expect(
        service.update(USER_ID, PRODUCT_ID, {}),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('throws 404 when the product does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          updateByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(
        service.update(USER_ID, PRODUCT_ID, { price: 10_000 }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('remove()', () => {
    it('deletes the product scoped to businessProfileId', async () => {
      const { repository, service } = makeService();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { deleteByIdAndBusiness } = repository;

      await service.remove(USER_ID, PRODUCT_ID);

      expect(deleteByIdAndBusiness).toHaveBeenCalledWith(PRODUCT_ID, BIZ_ID);
    });

    it('throws 404 when the product does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          deleteByIdAndBusiness: jest.fn().mockResolvedValue(false),
        },
      });

      await expect(service.remove(USER_ID, PRODUCT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('UpdateProductDto — name validation', () => {
    it('rejects an empty name string', async () => {
      const dto = plainToInstance(UpdateProductDto, { name: '' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('rejects a whitespace-only name that trims to empty', async () => {
      const dto = plainToInstance(UpdateProductDto, { name: '   ' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('accepts a valid name', async () => {
      const dto = plainToInstance(UpdateProductDto, { name: 'Kopi Susu Baru' });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });

    it('accepts an update where name is omitted (field is optional)', async () => {
      const dto = plainToInstance(UpdateProductDto, { price: 10_000 });
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });
  });
});
