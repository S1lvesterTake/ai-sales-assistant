import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import type { CreateFaqDto } from './dto/create-faq.dto';
import type { FaqQueryDto } from './dto/faq-query.dto';
import type { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqRecord, FaqsRepository } from './faqs.repository';

function nullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

@Injectable()
export class FaqsService {
  constructor(
    private readonly repository: FaqsRepository,
    private readonly ownership: BusinessOwnershipService,
  ) {}

  async create(userId: string, input: CreateFaqDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const faq = await this.repository.create({
      businessProfileId: owner.businessProfileId,
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: nullableText(input.category),
      isActive: input.isActive ?? true,
    });
    return this.toResponse(faq);
  }

  async get(userId: string, id: string) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();
    const faq = await this.repository.findByIdAndBusiness(
      id,
      owner.businessProfileId,
    );
    if (!faq) throw this.notFound();
    return this.toResponse(faq);
  }

  async list(userId: string, query: FaqQueryDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();
    const result = await this.repository.listByBusiness(
      owner.businessProfileId,
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        category: query.category,
        isActive: query.isActive,
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

  async update(userId: string, id: string, input: UpdateFaqDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const providedFields = [
      input.question,
      input.answer,
      input.category,
      input.isActive,
    ].filter((v) => v !== undefined);
    if (providedFields.length === 0) {
      throw new UnprocessableEntityException({
        message: 'Tidak ada perubahan yang dikirim',
        code: 'VALIDATION_ERROR',
      });
    }

    const update: Parameters<typeof this.repository.updateByIdAndBusiness>[2] =
      {};
    if (input.question !== undefined) update.question = input.question.trim();
    if (input.answer !== undefined) update.answer = input.answer.trim();
    if (input.category !== undefined)
      update.category = nullableText(input.category);
    if (input.isActive !== undefined) update.isActive = input.isActive;

    const faq = await this.repository.updateByIdAndBusiness(
      id,
      owner.businessProfileId,
      update,
    );
    if (!faq) throw this.notFound();
    return this.toResponse(faq);
  }

  async remove(userId: string, id: string) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();
    const deleted = await this.repository.deleteByIdAndBusiness(
      id,
      owner.businessProfileId,
    );
    if (!deleted) throw this.notFound();
  }

  private toResponse(faq: FaqRecord) {
    return {
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: faq.isActive,
      createdAt: faq.createdAt.toISOString(),
      updatedAt: faq.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'FAQ tidak ditemukan',
      code: 'FAQ_NOT_FOUND',
    });
  }

  private profileNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Profil bisnis belum dibuat',
      code: 'BUSINESS_PROFILE_NOT_FOUND',
    });
  }
}
