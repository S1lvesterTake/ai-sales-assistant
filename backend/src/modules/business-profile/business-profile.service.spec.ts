import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import {
  BusinessProfileRecord,
  BusinessProfileRepository,
} from './business-profile.repository';
import { BusinessProfileService } from './business-profile.service';

jest.mock('../../database/postgres-error', () => ({
  postgresErrorDetails: jest.fn().mockReturnValue(null),
}));

import { postgresErrorDetails } from '../../database/postgres-error';
const mockPostgresErrorDetails = postgresErrorDetails as jest.MockedFunction<
  typeof postgresErrorDetails
>;

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const SLUG = 'warung-test';

function fakeProfile(
  overrides: Partial<BusinessProfileRecord> = {},
): BusinessProfileRecord {
  return {
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
    ...overrides,
  };
}

function makeRepo(
  overrides: Partial<{
    [K in keyof BusinessProfileRepository]: jest.Mock;
  }> = {},
) {
  return {
    findByUserId: jest.fn().mockResolvedValue(null),
    findPublicBySlug: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(fakeProfile()),
    updateByUserId: jest.fn().mockResolvedValue(fakeProfile()),
    suggestedQuestions: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<BusinessProfileRepository>;
}

function makeService(
  repoOverrides: Partial<{
    [K in keyof BusinessProfileRepository]: jest.Mock;
  }> = {},
) {
  const repo = makeRepo(repoOverrides);
  return { repo, service: new BusinessProfileService(repo) };
}

describe('BusinessProfileService', () => {
  beforeEach(() => {
    mockPostgresErrorDetails.mockReturnValue(null);
  });

  describe('create()', () => {
    it('creates a profile and returns the private response shape', async () => {
      const { service } = makeService();

      const result = await service.create(USER_ID, {
        slug: SLUG,
        businessName: 'Warung Test',
        whatsappNumber: '081234567890',
      });

      expect(result).toMatchObject({
        slug: SLUG,
        businessName: 'Warung Test',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('throws ConflictException when the user already has a profile', async () => {
      const { service } = makeService({
        findByUserId: jest.fn().mockResolvedValue(fakeProfile()),
      });

      await expect(
        service.create(USER_ID, {
          slug: SLUG,
          businessName: 'B',
          whatsappNumber: '081234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on slug unique constraint violation', async () => {
      mockPostgresErrorDetails.mockReturnValue({
        code: '23505',
        constraint: 'business_profiles_slug_unique',
      });
      const { service } = makeService({
        create: jest.fn().mockRejectedValue(new Error('duplicate key')),
      });

      await expect(
        service.create(USER_ID, {
          slug: SLUG,
          businessName: 'B',
          whatsappNumber: '081234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on user_id unique constraint violation', async () => {
      mockPostgresErrorDetails.mockReturnValue({
        code: '23505',
        constraint: 'business_profiles_user_id_unique',
      });
      const { service } = makeService({
        create: jest.fn().mockRejectedValue(new Error('duplicate key')),
      });

      await expect(
        service.create(USER_ID, {
          slug: SLUG,
          businessName: 'B',
          whatsappNumber: '081234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('re-throws unknown database errors from create()', async () => {
      mockPostgresErrorDetails.mockReturnValue({
        code: '23505',
        constraint: 'some_other_constraint',
      });
      const dbError = new Error('unknown constraint');
      const { service } = makeService({
        create: jest.fn().mockRejectedValue(dbError),
      });

      await expect(
        service.create(USER_ID, {
          slug: SLUG,
          businessName: 'B',
          whatsappNumber: '081234567890',
        }),
      ).rejects.toThrow(dbError);
    });

    it('throws UnprocessableEntityException on invalid whatsappNumber', async () => {
      const { service } = makeService();

      await expect(
        service.create(USER_ID, {
          slug: SLUG,
          businessName: 'B',
          whatsappNumber: 'not-a-phone',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('getPrivate()', () => {
    it('returns the private profile response when found', async () => {
      const { service } = makeService({
        findByUserId: jest.fn().mockResolvedValue(fakeProfile()),
      });

      const result = await service.getPrivate(USER_ID);

      expect(result).toMatchObject({ slug: SLUG, businessName: 'Warung Test' });
    });

    it('throws NotFoundException when user has no profile', async () => {
      const { service } = makeService();

      await expect(service.getPrivate(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    const principal: AuthenticatedUser = {
      userId: USER_ID,
      email: 'test@test.com',
      isDemo: false,
    };

    it('updates fields and returns the updated profile', async () => {
      const { service } = makeService({
        updateByUserId: jest
          .fn()
          .mockResolvedValue(fakeProfile({ businessName: 'New Name' })),
      });

      const result = await service.update(principal, {
        businessName: 'New Name',
      });

      expect(result.businessName).toBe('New Name');
    });

    it('throws 422 when no fields are provided', async () => {
      const { service } = makeService();

      await expect(service.update(principal, {})).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws ForbiddenException when a demo user tries to change a protected field', async () => {
      const { service } = makeService({
        updateByUserId: jest.fn().mockResolvedValue(fakeProfile()),
      });
      const demoUser: AuthenticatedUser = { ...principal, isDemo: true };

      await expect(
        service.update(demoUser, { businessName: 'Hacked Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when updateByUserId returns null', async () => {
      const { service } = makeService({
        updateByUserId: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(principal, { description: 'New desc' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('converts empty string fields to null via nullableText', async () => {
      const { repo, service } = makeService({
        updateByUserId: jest.fn().mockResolvedValue(fakeProfile()),
      });

      await service.update(principal, { description: '' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.updateByUserId).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ description: null }),
      );
    });

    it('maps all optional fields to the update record', async () => {
      const { repo, service } = makeService({
        updateByUserId: jest.fn().mockResolvedValue(fakeProfile()),
      });

      await service.update(principal, {
        category: 'Kuliner',
        whatsappNumber: '081234567890',
        location: 'Jakarta',
        operatingHours: '08:00-22:00',
        mainOffer: 'Kopi terbaik',
        ctaMessage: 'Hubungi sekarang',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.updateByUserId).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          category: 'Kuliner',
          location: 'Jakarta',
          operatingHours: '08:00-22:00',
          mainOffer: 'Kopi terbaik',
          ctaMessage: 'Hubungi sekarang',
        }),
      );
    });
  });

  describe('getPublic()', () => {
    it('returns the public profile with suggestedQuestions', async () => {
      const { service } = makeService({
        findPublicBySlug: jest.fn().mockResolvedValue(fakeProfile()),
        suggestedQuestions: jest.fn().mockResolvedValue(['Berapa harga kopi?']),
      });

      const result = await service.getPublic(SLUG);

      expect(result).toMatchObject({
        slug: SLUG,
        businessName: 'Warung Test',
        suggestedQuestions: ['Berapa harga kopi?'],
      });
    });

    it('throws NotFoundException when slug is not found', async () => {
      const { service } = makeService();

      await expect(service.getPublic('unknown-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
