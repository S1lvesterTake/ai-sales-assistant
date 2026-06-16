import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { faqs } from '../../database/schema';

export type FaqRecord = typeof faqs.$inferSelect;

export type CreateFaqRecord = Pick<
  FaqRecord,
  'businessProfileId' | 'question' | 'answer' | 'category' | 'isActive'
>;

export type UpdateFaqRecord = Partial<
  Pick<FaqRecord, 'question' | 'answer' | 'category' | 'isActive'>
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
export class FaqsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateFaqRecord): Promise<FaqRecord> {
    const [faq] = await this.database.db.insert(faqs).values(input).returning();
    if (!faq) throw new Error('FAQ insert returned no row');
    return faq;
  }

  async findByIdAndBusiness(
    id: string,
    businessProfileId: string,
  ): Promise<FaqRecord | null> {
    const [faq] = await this.database.db
      .select()
      .from(faqs)
      .where(
        and(eq(faqs.id, id), eq(faqs.businessProfileId, businessProfileId)),
      )
      .limit(1);
    return faq ?? null;
  }

  async listByBusiness(
    businessProfileId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      isActive?: boolean;
    } = {},
  ): Promise<PaginatedResult<FaqRecord>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(faqs.businessProfileId, businessProfileId),
    ];

    if (options.search !== undefined && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push(
        or(ilike(faqs.question, term), ilike(faqs.answer, term))!,
      );
    }
    if (options.category !== undefined) {
      conditions.push(eq(faqs.category, options.category));
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(faqs.isActive, options.isActive));
    }

    const where = and(...conditions);

    const [items, totalRows] = await Promise.all([
      this.database.db
        .select()
        .from(faqs)
        .where(where)
        .orderBy(desc(faqs.createdAt), desc(faqs.id))
        .limit(limit)
        .offset(offset),
      this.database.db.$count(faqs, where),
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
    input: UpdateFaqRecord,
  ): Promise<FaqRecord | null> {
    const [faq] = await this.database.db
      .update(faqs)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(eq(faqs.id, id), eq(faqs.businessProfileId, businessProfileId)),
      )
      .returning();
    return faq ?? null;
  }

  async deleteByIdAndBusiness(
    id: string,
    businessProfileId: string,
  ): Promise<boolean> {
    const [deleted] = await this.database.db
      .delete(faqs)
      .where(
        and(eq(faqs.id, id), eq(faqs.businessProfileId, businessProfileId)),
      )
      .returning({ id: faqs.id });
    return deleted !== undefined;
  }
}
