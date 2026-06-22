import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { FaqRecord, FaqsRepository } from './faqs.repository';
import { FaqsService } from './faqs.service';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const FAQ_ID = '019b9d80-0000-0000-0000-000000000010';

function fakeFaq(overrides: Partial<FaqRecord> = {}): FaqRecord {
  return {
    id: FAQ_ID,
    businessProfileId: BIZ_ID,
    question: 'Apakah bisa pesan untuk acara?',
    answer: 'Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.',
    category: 'Pemesanan',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService({
  repoOverrides = {},
  ownerFound = true,
}: {
  repoOverrides?: Partial<{ [K in keyof FaqsRepository]: jest.Mock }>;
  ownerFound?: boolean;
} = {}) {
  const repository = {
    create: jest.fn().mockResolvedValue(fakeFaq()),
    findByIdAndBusiness: jest.fn().mockResolvedValue(fakeFaq()),
    listByBusiness: jest.fn().mockResolvedValue({
      items: [fakeFaq()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    updateByIdAndBusiness: jest.fn().mockResolvedValue(fakeFaq()),
    deleteByIdAndBusiness: jest.fn().mockResolvedValue(true),
    ...repoOverrides,
  } as unknown as jest.Mocked<FaqsRepository>;

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
    service: new FaqsService(repository, ownership),
  };
}

describe('FaqsService', () => {
  describe('create()', () => {
    it('scopes the new FAQ to the caller businessProfileId', async () => {
      const { repository, service } = makeService();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { create } = repository;

      const result = await service.create(USER_ID, {
        question: 'Apakah bisa pesan untuk acara?',
        answer: 'Bisa.',
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ businessProfileId: BIZ_ID }),
      );
      expect(result).toMatchObject({
        question: 'Apakah bisa pesan untuk acara?',
      });
    });

    it('throws 404 when the caller has no business profile', async () => {
      const { service } = makeService({ ownerFound: false });

      await expect(
        service.create(USER_ID, { question: 'Q?', answer: 'A.' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('maps createdAt and updatedAt to ISO strings in the response', async () => {
      const { service } = makeService();

      const result = await service.create(USER_ID, {
        question: 'Q?',
        answer: 'A.',
      });

      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('get()', () => {
    it('returns the FAQ when it belongs to the caller business', async () => {
      const { service } = makeService();

      const result = await service.get(USER_ID, FAQ_ID);

      expect(result).toMatchObject({ id: FAQ_ID });
    });

    it('throws 404 when the FAQ does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          findByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.get(USER_ID, FAQ_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws 404 when the caller has no business profile', async () => {
      const { service } = makeService({ ownerFound: false });

      await expect(service.get(USER_ID, FAQ_ID)).rejects.toMatchObject({
        status: 404,
      });
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

    it('returns an empty array and zero total when the business has no FAQs', async () => {
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
    it('builds the update scoped to businessProfileId and returns the updated FAQ', async () => {
      const updated = fakeFaq({ question: 'Updated question?' });
      const { repository, service } = makeService({
        repoOverrides: {
          updateByIdAndBusiness: jest.fn().mockResolvedValue(updated),
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { updateByIdAndBusiness } = repository;

      const result = await service.update(USER_ID, FAQ_ID, {
        question: 'Updated question?',
      });

      expect(updateByIdAndBusiness).toHaveBeenCalledWith(
        FAQ_ID,
        BIZ_ID,
        expect.objectContaining({ question: 'Updated question?' }),
      );
      expect(result.question).toBe('Updated question?');
    });

    it('throws 422 when the request body provides no recognizable fields', async () => {
      const { service } = makeService();

      await expect(service.update(USER_ID, FAQ_ID, {})).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 404 when the FAQ does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          updateByIdAndBusiness: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(
        service.update(USER_ID, FAQ_ID, { answer: 'New answer.' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('converts empty category string to null via nullableText', async () => {
      const { repository, service } = makeService({
        repoOverrides: {
          updateByIdAndBusiness: jest.fn().mockResolvedValue(fakeFaq()),
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { updateByIdAndBusiness } = repository;

      await service.update(USER_ID, FAQ_ID, { category: '' });

      expect(updateByIdAndBusiness).toHaveBeenCalledWith(
        FAQ_ID,
        BIZ_ID,
        expect.objectContaining({ category: null }),
      );
    });
  });

  describe('remove()', () => {
    it('deletes the FAQ scoped to businessProfileId', async () => {
      const { repository, service } = makeService();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { deleteByIdAndBusiness } = repository;

      await service.remove(USER_ID, FAQ_ID);

      expect(deleteByIdAndBusiness).toHaveBeenCalledWith(FAQ_ID, BIZ_ID);
    });

    it('throws 404 when the FAQ does not exist for this business', async () => {
      const { service } = makeService({
        repoOverrides: {
          deleteByIdAndBusiness: jest.fn().mockResolvedValue(false),
        },
      });

      await expect(service.remove(USER_ID, FAQ_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
