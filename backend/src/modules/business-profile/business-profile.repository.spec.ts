import { DatabaseService } from '../../database/database.service';
import { BusinessProfileRepository } from './business-profile.repository';

const USER_ID = '019b9d80-0000-0000-0000-000000000001';
const SLUG = 'warung-test';

const mockProfile = {
  id: 'bp-1',
  userId: USER_ID,
  slug: SLUG,
  businessName: 'Warung Test',
  description: null,
  category: null,
  whatsappNumber: '6281234567890',
  location: null,
  operatingHours: null,
  mainOffer: null,
  ctaMessage: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const createInput = {
  userId: USER_ID,
  slug: SLUG,
  businessName: 'Warung Test',
  description: null as string | null,
  category: null as string | null,
  whatsappNumber: '6281234567890',
  location: null as string | null,
  operatingHours: null as string | null,
  mainOffer: null as string | null,
  ctaMessage: null as string | null,
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

describe('BusinessProfileRepository', () => {
  describe('findByUserId()', () => {
    it('returns the profile when found', async () => {
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([mockProfile]),
      });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.findByUserId(USER_ID);

      expect(result).toEqual(mockProfile);
    });

    it('returns null when no profile exists for the user', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.findByUserId('unknown-user');

      expect(result).toBeNull();
    });
  });

  describe('findPublicBySlug()', () => {
    it('returns the public profile when slug matches', async () => {
      const publicProfile = {
        id: 'bp-1',
        slug: SLUG,
        businessName: 'Warung Test',
        description: null,
        category: null,
        location: null,
        operatingHours: null,
        mainOffer: null,
        ctaMessage: null,
      };
      const database = makeDb({
        limit: jest.fn().mockResolvedValue([publicProfile]),
      });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.findPublicBySlug(SLUG);

      expect(result).toEqual(publicProfile);
    });

    it('returns null when slug is not found', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.findPublicBySlug('unknown-slug');

      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('inserts and returns the created profile', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockProfile]),
      });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.create(createInput);

      expect(result).toEqual(mockProfile);
    });

    it('throws when the DB insert returns no row', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      await expect(repo.create(createInput)).rejects.toThrow(
        'Business profile insert returned no row',
      );
    });
  });

  describe('updateByUserId()', () => {
    it('returns the updated profile when found', async () => {
      const updated = { ...mockProfile, businessName: 'New Name' };
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([updated]),
      });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.updateByUserId(USER_ID, {
        businessName: 'New Name',
      });

      expect(result).toEqual(updated);
    });

    it('returns null when user has no profile', async () => {
      const database = makeDb({ returning: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.updateByUserId('unknown-user', {
        businessName: 'X',
      });

      expect(result).toBeNull();
    });
  });

  describe('suggestedQuestions()', () => {
    it('builds product-based and faq-based questions', async () => {
      const limitMock = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'Kopi Susu' }]) // products query
        .mockResolvedValueOnce([
          { question: 'Apakah ada delivery?' },
          { question: 'Bisa custom rasa?' },
        ]); // faqs query
      const database = makeDb({ limit: limitMock });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.suggestedQuestions({
        id: 'bp-1',
        operatingHours: null,
      });

      expect(result).toContain('Berapa harga Kopi Susu?');
      expect(result).toContain('Apakah ada delivery?');
    });

    it('returns an empty array when no products and no FAQs exist', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.suggestedQuestions({
        id: 'bp-1',
        operatingHours: null,
      });

      expect(result).toEqual([]);
    });

    it('adds operating hours question when fewer than 3 questions and operatingHours is set', async () => {
      const database = makeDb({ limit: jest.fn().mockResolvedValue([]) });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.suggestedQuestions({
        id: 'bp-1',
        operatingHours: '08:00-22:00',
      });

      expect(result).toContain('Jam bukanya sampai kapan?');
    });

    it('caps the result at 3 questions', async () => {
      const limitMock = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'Kopi' }])
        .mockResolvedValueOnce([
          { question: 'Q1?' },
          { question: 'Q2?' },
          { question: 'Q3?' },
        ]);
      const database = makeDb({ limit: limitMock });
      const repo = new BusinessProfileRepository(database);

      const result = await repo.suggestedQuestions({
        id: 'bp-1',
        operatingHours: '08:00-22:00',
      });

      expect(result).toHaveLength(3);
    });
  });
});
