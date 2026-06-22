import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  resolveBusinessBySlug,
  resolveBusinessWithWhatsappBySlug,
  validateSlug,
} from './slug';

function makeDb(row?: Record<string, unknown> | null) {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue(row !== undefined && row !== null ? [row] : []),
    },
  } as unknown as DatabaseService;
}

describe('slug utils', () => {
  describe('validateSlug()', () => {
    it('passes for a valid lowercase slug', () => {
      expect(() => validateSlug('warung-kopi-123')).not.toThrow();
    });

    it('throws UnprocessableEntityException for uppercase letters', () => {
      expect(() => validateSlug('Warung-Kopi')).toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException for trailing hyphen', () => {
      expect(() => validateSlug('warung-')).toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException for spaces', () => {
      expect(() => validateSlug('warung kopi')).toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('resolveBusinessBySlug()', () => {
    it('returns id and slug when business is found', async () => {
      const row = { id: 'bp-1', slug: 'warung-test', whatsappNumber: '628123' };
      const db = makeDb(row);

      const result = await resolveBusinessBySlug(db, 'warung-test');

      expect(result).toEqual({ id: 'bp-1', slug: 'warung-test' });
    });

    it('throws NotFoundException when no business has that slug', async () => {
      const db = makeDb(null);

      await expect(resolveBusinessBySlug(db, 'unknown-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnprocessableEntityException for an invalid slug', async () => {
      const db = makeDb();

      await expect(resolveBusinessBySlug(db, 'INVALID!')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('resolveBusinessWithWhatsappBySlug()', () => {
    it('returns id, slug, and whatsappNumber when business is found', async () => {
      const row = {
        id: 'bp-1',
        slug: 'warung-test',
        whatsappNumber: '6281234567890',
      };
      const db = makeDb(row);

      const result = await resolveBusinessWithWhatsappBySlug(db, 'warung-test');

      expect(result).toEqual(row);
    });

    it('throws NotFoundException when business not found', async () => {
      const db = makeDb(null);

      await expect(
        resolveBusinessWithWhatsappBySlug(db, 'no-such-slug'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
