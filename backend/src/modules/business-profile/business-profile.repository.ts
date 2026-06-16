import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { businessProfiles, faqs, products } from '../../database/schema';

export type BusinessProfileRecord = typeof businessProfiles.$inferSelect;
export type PublicBusinessProfileRecord = Pick<
  BusinessProfileRecord,
  | 'businessName'
  | 'category'
  | 'ctaMessage'
  | 'description'
  | 'id'
  | 'location'
  | 'mainOffer'
  | 'operatingHours'
  | 'slug'
>;

export type CreateBusinessProfileRecord = Pick<
  BusinessProfileRecord,
  | 'businessName'
  | 'category'
  | 'ctaMessage'
  | 'description'
  | 'location'
  | 'mainOffer'
  | 'operatingHours'
  | 'slug'
  | 'userId'
  | 'whatsappNumber'
>;

export type UpdateBusinessProfileRecord = Partial<
  Pick<
    BusinessProfileRecord,
    | 'businessName'
    | 'category'
    | 'ctaMessage'
    | 'description'
    | 'location'
    | 'mainOffer'
    | 'operatingHours'
    | 'whatsappNumber'
  >
>;

@Injectable()
export class BusinessProfileRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<BusinessProfileRecord | null> {
    const [profile] = await this.database.db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, userId))
      .limit(1);
    return profile ?? null;
  }

  async findPublicBySlug(
    slug: string,
  ): Promise<PublicBusinessProfileRecord | null> {
    const [profile] = await this.database.db
      .select({
        id: businessProfiles.id,
        slug: businessProfiles.slug,
        businessName: businessProfiles.businessName,
        description: businessProfiles.description,
        category: businessProfiles.category,
        location: businessProfiles.location,
        operatingHours: businessProfiles.operatingHours,
        mainOffer: businessProfiles.mainOffer,
        ctaMessage: businessProfiles.ctaMessage,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.slug, slug))
      .limit(1);
    return profile ?? null;
  }

  async create(
    input: CreateBusinessProfileRecord,
  ): Promise<BusinessProfileRecord> {
    const [profile] = await this.database.db
      .insert(businessProfiles)
      .values(input)
      .returning();
    if (!profile) throw new Error('Business profile insert returned no row');
    return profile;
  }

  async updateByUserId(
    userId: string,
    input: UpdateBusinessProfileRecord,
  ): Promise<BusinessProfileRecord | null> {
    const [profile] = await this.database.db
      .update(businessProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(businessProfiles.userId, userId))
      .returning();
    return profile ?? null;
  }

  async suggestedQuestions(
    profile: Pick<BusinessProfileRecord, 'id' | 'operatingHours'>,
  ): Promise<string[]> {
    const [availableProducts, activeFaqs] = await Promise.all([
      this.database.db
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            eq(products.businessProfileId, profile.id),
            eq(products.isAvailable, true),
          ),
        )
        .orderBy(desc(products.createdAt), desc(products.id))
        .limit(1),
      this.database.db
        .select({ question: faqs.question })
        .from(faqs)
        .where(
          and(eq(faqs.businessProfileId, profile.id), eq(faqs.isActive, true)),
        )
        .orderBy(desc(faqs.createdAt), desc(faqs.id))
        .limit(3),
    ]);

    const questions: string[] = [];
    const product = availableProducts[0];
    if (product) questions.push(`Berapa harga ${product.name}?`);
    for (const faq of activeFaqs) {
      if (questions.length === 3) break;
      if (!questions.includes(faq.question)) questions.push(faq.question);
    }
    if (questions.length < 3 && profile.operatingHours) {
      questions.push('Jam bukanya sampai kapan?');
    }
    return questions.slice(0, 3);
  }
}
