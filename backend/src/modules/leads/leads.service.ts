import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { businessProfiles } from '../../database/schema';
import {
  InvalidIndonesianPhoneError,
  normalizeIndonesianPhone,
} from '../../common/utils/indonesian-phone';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import { ChatSessionAuthService } from '../chat/chat-session-auth.service';
import { isUniqueViolation } from '../../database/postgres-error';
import { LeadRecord, LeadsRepository } from './leads.repository';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { LeadQueryDto } from './dto/lead-query.dto';
import type { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly repository: LeadsRepository,
    private readonly ownership: BusinessOwnershipService,
    private readonly chatAuth: ChatSessionAuthService,
    private readonly database: DatabaseService,
  ) {}

  async createViaJwt(userId: string, input: CreateLeadDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const phone = this.normalizePhone(input.phone);

    try {
      const lead = await this.repository.create({
        businessProfileId: owner.businessProfileId,
        chatSessionId: input.chatSessionId ?? null,
        name: input.name ?? null,
        phone,
        interestSummary: input.interestSummary ?? null,
        source: 'manual',
        status: 'new',
      });
      return this.toResponse(lead);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.phoneConflict();
      throw error;
    }
  }

  async createViaChatToken(
    businessSlug: string,
    chatSessionId: string,
    rawToken: string,
    input: CreateLeadDto,
  ) {
    const profile = await this.resolveBusiness(businessSlug);

    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'Token sesi diperlukan',
        code: 'MISSING_CHAT_SESSION_TOKEN',
      });
    }

    // Verify session token
    await this.chatAuth.authorize(chatSessionId, profile.id, rawToken);

    const phone = this.normalizePhone(input.phone);

    try {
      const lead = await this.repository.create({
        businessProfileId: profile.id,
        chatSessionId,
        name: input.name ?? null,
        phone,
        interestSummary: input.interestSummary ?? null,
        source: 'chatbot',
        status: 'new',
      });
      return this.toResponse(lead);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.phoneConflict();
      throw error;
    }
  }

  async list(userId: string, query: LeadQueryDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const result = await this.repository.listByBusiness(
      owner.businessProfileId,
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
      },
    );

    return {
      success: true as const,
      data: result.items.map((item) => this.toResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async get(userId: string, id: string) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const lead = await this.repository.findByIdAndBusiness(
      id,
      owner.businessProfileId,
    );
    if (!lead) throw this.notFound();
    return this.toResponse(lead);
  }

  async updateStatus(userId: string, id: string, input: UpdateLeadStatusDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const lead = await this.repository.updateStatusByIdAndBusiness(
      id,
      owner.businessProfileId,
      input.status,
    );
    if (!lead) throw this.notFound();
    return this.toResponse(lead);
  }

  private toResponse(lead: LeadRecord) {
    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      interestSummary: lead.interestSummary,
      status: lead.status,
      source: lead.source,
      chatSessionId: lead.chatSessionId,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
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
            field: 'phone',
            message: 'Gunakan format 08, 628, atau +628 yang valid',
          },
        ],
      });
    }
  }

  private async resolveBusiness(slug: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new UnprocessableEntityException({
        message: 'Format slug bisnis tidak valid',
        code: 'VALIDATION_ERROR',
      });
    }

    const [profile] = await this.database.db
      .select({ id: businessProfiles.id, slug: businessProfiles.slug })
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

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'Lead tidak ditemukan',
      code: 'LEAD_NOT_FOUND',
    });
  }

  private profileNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Profil bisnis belum dibuat',
      code: 'BUSINESS_PROFILE_NOT_FOUND',
    });
  }

  private phoneConflict(): ConflictException {
    return new ConflictException({
      message: 'Nomor telepon sudah terdaftar sebagai lead',
      code: 'LEAD_PHONE_ALREADY_EXISTS',
      errors: [{ field: 'phone', message: 'Gunakan nomor telepon lain' }],
    });
  }
}
