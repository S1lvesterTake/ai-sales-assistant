import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import {
  InvalidIndonesianPhoneError,
  normalizeIndonesianPhone,
} from '../../common/utils/indonesian-phone';
import { postgresErrorDetails } from '../../database/postgres-error';
import {
  BusinessProfileRecord,
  BusinessProfileRepository,
  UpdateBusinessProfileRecord,
} from './business-profile.repository';
import type { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import type { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

const DEMO_PROTECTED_FIELDS = [
  'businessName',
  'category',
  'whatsappNumber',
] as const satisfies ReadonlyArray<keyof UpdateBusinessProfileDto>;

function nullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

@Injectable()
export class BusinessProfileService {
  constructor(private readonly repository: BusinessProfileRepository) {}

  async create(userId: string, input: CreateBusinessProfileDto) {
    if (await this.repository.findByUserId(userId)) {
      throw this.profileExists();
    }

    try {
      return this.toPrivateResponse(
        await this.repository.create({
          userId,
          slug: input.slug,
          businessName: input.businessName.trim(),
          description: nullableText(input.description),
          category: nullableText(input.category),
          whatsappNumber: this.normalizePhone(input.whatsappNumber),
          location: nullableText(input.location),
          operatingHours: nullableText(input.operatingHours),
          mainOffer: nullableText(input.mainOffer),
          ctaMessage: nullableText(input.ctaMessage),
        }),
      );
    } catch (error) {
      const details = postgresErrorDetails(error);
      const constraint = details?.code === '23505' ? details.constraint : null;
      if (constraint === 'business_profiles_slug_unique') {
        throw this.slugConflict();
      }
      if (constraint === 'business_profiles_user_id_unique') {
        throw this.profileExists();
      }
      throw error;
    }
  }

  async getPrivate(userId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) throw this.notFound();
    return this.toPrivateResponse(profile);
  }

  async update(principal: AuthenticatedUser, input: UpdateBusinessProfileDto) {
    const providedFields = [
      input.businessName,
      input.description,
      input.category,
      input.whatsappNumber,
      input.location,
      input.operatingHours,
      input.mainOffer,
      input.ctaMessage,
    ].filter((value) => value !== undefined);
    if (providedFields.length === 0) {
      throw new UnprocessableEntityException({
        message: 'Tidak ada perubahan yang dikirim',
        code: 'VALIDATION_ERROR',
      });
    }
    if (principal.isDemo) this.assertDemoFields(input);

    const update: UpdateBusinessProfileRecord = {};
    if (input.businessName !== undefined) {
      update.businessName = input.businessName.trim();
    }
    if (input.description !== undefined) {
      update.description = nullableText(input.description);
    }
    if (input.category !== undefined) {
      update.category = nullableText(input.category);
    }
    if (input.whatsappNumber !== undefined) {
      update.whatsappNumber = this.normalizePhone(input.whatsappNumber);
    }
    if (input.location !== undefined) {
      update.location = nullableText(input.location);
    }
    if (input.operatingHours !== undefined) {
      update.operatingHours = nullableText(input.operatingHours);
    }
    if (input.mainOffer !== undefined) {
      update.mainOffer = nullableText(input.mainOffer);
    }
    if (input.ctaMessage !== undefined) {
      update.ctaMessage = nullableText(input.ctaMessage);
    }

    const profile = await this.repository.updateByUserId(
      principal.userId,
      update,
    );
    if (!profile) throw this.notFound();
    return this.toPrivateResponse(profile);
  }

  async getPublic(slug: string) {
    const profile = await this.repository.findPublicBySlug(slug);
    if (!profile) {
      throw new NotFoundException({
        message: 'Bisnis tidak ditemukan',
        code: 'BUSINESS_NOT_FOUND',
      });
    }
    return {
      slug: profile.slug,
      businessName: profile.businessName,
      description: profile.description,
      category: profile.category,
      location: profile.location,
      operatingHours: profile.operatingHours,
      mainOffer: profile.mainOffer,
      ctaMessage: profile.ctaMessage,
      suggestedQuestions: await this.repository.suggestedQuestions(profile),
    };
  }

  private assertDemoFields(input: UpdateBusinessProfileDto): void {
    const protectedFields = DEMO_PROTECTED_FIELDS.filter(
      (field) => input[field] !== undefined,
    );
    if (protectedFields.length === 0) return;
    throw new ForbiddenException({
      message: 'Identitas inti bisnis demo tidak dapat diubah',
      code: 'DEMO_PROFILE_FIELD_PROTECTED',
      errors: protectedFields.map((field) => ({
        field,
        message: 'Field ini dilindungi untuk akun demo',
      })),
    });
  }

  private normalizePhone(value: string): string {
    try {
      return normalizeIndonesianPhone(value);
    } catch (error) {
      if (!(error instanceof InvalidIndonesianPhoneError)) throw error;
      throw new UnprocessableEntityException({
        message: 'Nomor WhatsApp tidak valid',
        code: 'VALIDATION_ERROR',
        errors: [
          {
            field: 'whatsappNumber',
            message: 'Gunakan format 08, 628, atau +628 yang valid',
          },
        ],
      });
    }
  }

  private toPrivateResponse(profile: BusinessProfileRecord) {
    return {
      id: profile.id,
      businessName: profile.businessName,
      slug: profile.slug,
      description: profile.description,
      category: profile.category,
      whatsappNumber: profile.whatsappNumber,
      location: profile.location,
      operatingHours: profile.operatingHours,
      mainOffer: profile.mainOffer,
      ctaMessage: profile.ctaMessage,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private profileExists(): ConflictException {
    return new ConflictException({
      message: 'Profil bisnis untuk akun ini sudah ada',
      code: 'BUSINESS_PROFILE_ALREADY_EXISTS',
    });
  }

  private slugConflict(): ConflictException {
    return new ConflictException({
      message: 'Slug bisnis sudah digunakan',
      code: 'SLUG_ALREADY_EXISTS',
      errors: [{ field: 'slug', message: 'Gunakan slug lain' }],
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'Profil bisnis belum dibuat',
      code: 'BUSINESS_PROFILE_NOT_FOUND',
    });
  }
}
