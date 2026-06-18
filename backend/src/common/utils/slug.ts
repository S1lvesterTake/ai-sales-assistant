import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { businessProfiles } from '../../database/schema';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new UnprocessableEntityException({
      message: 'Format slug bisnis tidak valid',
      code: 'VALIDATION_ERROR',
      errors: [
        {
          field: 'businessSlug',
          message: 'Slug harus berupa huruf kecil, angka, dan tanda hubung',
        },
      ],
    });
  }
}

async function fetchBySlug(db: DatabaseService, slug: string) {
  validateSlug(slug);

  const [profile] = await db.db
    .select({
      id: businessProfiles.id,
      slug: businessProfiles.slug,
      whatsappNumber: businessProfiles.whatsappNumber,
    })
    .from(businessProfiles)
    .where(eq(businessProfiles.slug, slug))
    .limit(1);

  if (!profile) {
    throw new NotFoundException({
      message: 'Bisnis tidak ditemukan',
      code: 'BUSINESS_NOT_FOUND',
    });
  }
  return profile;
}

export async function resolveBusinessBySlug(
  db: DatabaseService,
  slug: string,
): Promise<{ id: string; slug: string }> {
  const { id, slug: s } = await fetchBySlug(db, slug);
  return { id, slug: s };
}

export async function resolveBusinessWithWhatsappBySlug(
  db: DatabaseService,
  slug: string,
): Promise<{ id: string; slug: string; whatsappNumber: string }> {
  return fetchBySlug(db, slug);
}
