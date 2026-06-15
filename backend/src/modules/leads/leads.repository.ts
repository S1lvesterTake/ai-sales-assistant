import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { leads } from '../../database/schema';

export type LeadRecord = typeof leads.$inferSelect;

export type CreateLeadRecord = Pick<
  LeadRecord,
  | 'businessProfileId'
  | 'chatSessionId'
  | 'name'
  | 'phone'
  | 'interestSummary'
  | 'source'
  | 'status'
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
export class LeadsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateLeadRecord): Promise<LeadRecord> {
    const [lead] = await this.database.db
      .insert(leads)
      .values(input)
      .returning();
    if (!lead) throw new Error('Lead insert returned no row');
    return lead;
  }

  async findByIdAndBusiness(
    id: string,
    businessProfileId: string,
  ): Promise<LeadRecord | null> {
    const [lead] = await this.database.db
      .select()
      .from(leads)
      .where(
        and(eq(leads.id, id), eq(leads.businessProfileId, businessProfileId)),
      )
      .limit(1);
    return lead ?? null;
  }

  async listByBusiness(
    businessProfileId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
  ): Promise<PaginatedResult<LeadRecord>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(leads.businessProfileId, businessProfileId),
    ];

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push(
        or(ilike(leads.name ?? '', term), ilike(leads.phone, term))!,
      );
    }
    if (options.status) {
      const statusValue = options.status as LeadRecord['status'];
      conditions.push(eq(leads.status, statusValue));
    }

    const where = and(...conditions);

    const [items, totalRows] = await Promise.all([
      this.database.db
        .select()
        .from(leads)
        .where(where)
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(limit)
        .offset(offset),
      this.database.db.$count(leads, where),
    ]);

    return {
      items,
      total: totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit),
    };
  }

  async updateStatusByIdAndBusiness(
    id: string,
    businessProfileId: string,
    status: string,
  ): Promise<LeadRecord | null> {
    const [lead] = await this.database.db
      .update(leads)
      .set({ status: status as LeadRecord['status'], updatedAt: new Date() })
      .where(
        and(eq(leads.id, id), eq(leads.businessProfileId, businessProfileId)),
      )
      .returning();
    return lead ?? null;
  }
}
