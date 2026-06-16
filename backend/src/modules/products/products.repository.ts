import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { products } from '../../database/schema';

export type ProductRecord = typeof products.$inferSelect;

export type CreateProductRecord = Pick<
  ProductRecord,
  | 'businessProfileId'
  | 'name'
  | 'description'
  | 'price'
  | 'category'
  | 'isAvailable'
  | 'orderingInstruction'
  | 'additionalNotes'
>;

export type UpdateProductRecord = Partial<
  Pick<
    ProductRecord,
    | 'name'
    | 'description'
    | 'price'
    | 'category'
    | 'isAvailable'
    | 'orderingInstruction'
    | 'additionalNotes'
  >
>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateProductRecord): Promise<ProductRecord> {
    const [product] = await this.database.db
      .insert(products)
      .values(input)
      .returning();
    if (!product) throw new Error('Product insert returned no row');
    return product;
  }

  async findByIdAndBusiness(
    id: string,
    businessProfileId: string,
  ): Promise<ProductRecord | null> {
    const [product] = await this.database.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.businessProfileId, businessProfileId),
        ),
      )
      .limit(1);
    return product ?? null;
  }

  async listByBusiness(
    businessProfileId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      isAvailable?: boolean;
    } = {},
  ): Promise<PaginatedResult<ProductRecord>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(products.businessProfileId, businessProfileId),
    ];

    if (options.category !== undefined) {
      conditions.push(eq(products.category, options.category));
    }
    if (options.isAvailable !== undefined) {
      conditions.push(eq(products.isAvailable, options.isAvailable));
    }

    const where = and(...conditions);

    const [items, totalRows] = await Promise.all([
      this.database.db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.createdAt), desc(products.id))
        .limit(limit)
        .offset(offset),
      this.database.db.$count(products, where),
    ]);

    return {
      items,
      total: totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit),
    };
  }

  async updateByIdAndBusiness(
    id: string,
    businessProfileId: string,
    input: UpdateProductRecord,
  ): Promise<ProductRecord | null> {
    const [product] = await this.database.db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(products.id, id),
          eq(products.businessProfileId, businessProfileId),
        ),
      )
      .returning();
    return product ?? null;
  }

  async deleteByIdAndBusiness(
    id: string,
    businessProfileId: string,
  ): Promise<boolean> {
    const [deleted] = await this.database.db
      .delete(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.businessProfileId, businessProfileId),
        ),
      )
      .returning({ id: products.id });
    return deleted !== undefined;
  }
}
