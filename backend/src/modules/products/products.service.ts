import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BusinessOwnershipService } from '../../common/ownership/business-ownership.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { ProductRecord, ProductsRepository } from './products.repository';

function nullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly ownership: BusinessOwnershipService,
  ) {}

  async create(userId: string, input: CreateProductDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const product = await this.repository.create({
      businessProfileId: owner.businessProfileId,
      name: input.name.trim(),
      description: nullableText(input.description),
      price: input.price,
      category: nullableText(input.category),
      isAvailable: input.isAvailable ?? true,
      orderingInstruction: nullableText(input.orderingInstruction),
      additionalNotes: nullableText(input.additionalNotes),
    });
    return this.toResponse(product);
  }

  async get(userId: string, id: string) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();
    const product = await this.repository.findByIdAndBusiness(
      id,
      owner.businessProfileId,
    );
    if (!product) throw this.notFound();
    return this.toResponse(product);
  }

  async list(userId: string, query: ProductQueryDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();
    const result = await this.repository.listByBusiness(
      owner.businessProfileId,
      {
        page: query.page,
        limit: query.limit,
        category: query.category,
        isAvailable: query.isAvailable,
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

  async update(userId: string, id: string, input: UpdateProductDto) {
    const owner = await this.ownership.findByUserId(userId);
    if (!owner) throw this.profileNotFound();

    const providedFields = [
      input.name,
      input.description,
      input.price,
      input.category,
      input.isAvailable,
      input.orderingInstruction,
      input.additionalNotes,
    ].filter((v) => v !== undefined);
    if (providedFields.length === 0) {
      throw new UnprocessableEntityException({
        message: 'Tidak ada perubahan yang dikirim',
        code: 'VALIDATION_ERROR',
      });
    }

    const update: Parameters<typeof this.repository.updateByIdAndBusiness>[2] =
      {};
    if (input.name !== undefined) update.name = input.name.trim();
    if (input.description !== undefined)
      update.description = nullableText(input.description);
    if (input.price !== undefined) update.price = input.price;
    if (input.category !== undefined)
      update.category = nullableText(input.category);
    if (input.isAvailable !== undefined) update.isAvailable = input.isAvailable;
    if (input.orderingInstruction !== undefined)
      update.orderingInstruction = nullableText(input.orderingInstruction);
    if (input.additionalNotes !== undefined)
      update.additionalNotes = nullableText(input.additionalNotes);

    const product = await this.repository.updateByIdAndBusiness(
      id,
      owner.businessProfileId,
      update,
    );
    if (!product) throw this.notFound();
    return this.toResponse(product);
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

  private toResponse(product: ProductRecord) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      isAvailable: product.isAvailable,
      orderingInstruction: product.orderingInstruction,
      additionalNotes: product.additionalNotes,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'Produk tidak ditemukan',
      code: 'PRODUCT_NOT_FOUND',
    });
  }

  private profileNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Profil bisnis belum dibuat',
      code: 'BUSINESS_PROFILE_NOT_FOUND',
    });
  }
}
