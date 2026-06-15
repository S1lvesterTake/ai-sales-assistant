import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { and, eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../database.service';
import {
  businessProfiles,
  chatSessions,
  faqs,
  leads,
  products,
  users,
  whatsappClickEvents,
} from '../schema';
import {
  DEMO_EMAIL,
  DEMO_FAQS,
  DEMO_PRODUCTS,
  DEMO_PROFILE,
  DEMO_PROFILE_ID,
  DEMO_USER_ID,
  DEMO_USER_NAME,
} from './demo-data';

const BCRYPT_COST = 12;

export type DemoDataCommand = 'reset' | 'seed';

export interface DemoDataResult {
  command: DemoDataCommand;
  businessSlug: string;
  faqCount: number;
  productCount: number;
}

@Injectable()
export class DemoDataService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: DemoDataCommand): Promise<DemoDataResult> {
    if (command === 'reset') this.assertResetAllowed();
    const passwordHash = await bcrypt.hash(
      this.readDemoPassword(),
      BCRYPT_COST,
    );

    return this.database.db.transaction(async (tx) => {
      const candidateUsers = await tx
        .select()
        .from(users)
        .where(or(eq(users.email, DEMO_EMAIL), eq(users.isDemo, true)))
        .for('update');
      const emailUser = candidateUsers.find(
        (user) => user.email === DEMO_EMAIL,
      );
      if (emailUser && !emailUser.isDemo) {
        throw new Error('Demo email is owned by a non-demo account');
      }
      const otherDemo = candidateUsers.find(
        (user) => user.isDemo && user.email !== DEMO_EMAIL,
      );
      if (otherDemo) {
        throw new Error('Another account is already marked as demo');
      }

      let demoUser = emailUser;
      if (!demoUser) {
        const [created] = await tx
          .insert(users)
          .values({
            id: DEMO_USER_ID,
            name: DEMO_USER_NAME,
            email: DEMO_EMAIL,
            passwordHash,
            isDemo: true,
          })
          .returning();
        if (!created) throw new Error('Demo user insert returned no row');
        demoUser = created;
      } else {
        const [updated] = await tx
          .update(users)
          .set({
            name: DEMO_USER_NAME,
            passwordHash,
            isDemo: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, demoUser.id))
          .returning();
        if (!updated) throw new Error('Demo user update returned no row');
        demoUser = updated;
      }

      const candidateProfiles = await tx
        .select()
        .from(businessProfiles)
        .where(
          or(
            eq(businessProfiles.userId, demoUser.id),
            eq(businessProfiles.slug, DEMO_PROFILE.slug),
          ),
        )
        .for('update');
      const slugProfile = candidateProfiles.find(
        (profile) => profile.slug === DEMO_PROFILE.slug,
      );
      if (slugProfile && slugProfile.userId !== demoUser.id) {
        throw new Error('Demo slug is owned by a non-demo account');
      }

      let demoProfile = candidateProfiles.find(
        (profile) => profile.userId === demoUser.id,
      );
      if (!demoProfile) {
        const [created] = await tx
          .insert(businessProfiles)
          .values({
            id: DEMO_PROFILE_ID,
            userId: demoUser.id,
            ...DEMO_PROFILE,
          })
          .returning();
        if (!created) throw new Error('Demo profile insert returned no row');
        demoProfile = created;
      } else {
        const [updated] = await tx
          .update(businessProfiles)
          .set({ ...DEMO_PROFILE, updatedAt: new Date() })
          .where(
            and(
              eq(businessProfiles.id, demoProfile.id),
              eq(businessProfiles.userId, demoUser.id),
            ),
          )
          .returning();
        if (!updated) throw new Error('Demo profile update returned no row');
        demoProfile = updated;
      }

      if (command === 'reset') {
        await tx
          .delete(whatsappClickEvents)
          .where(eq(whatsappClickEvents.businessProfileId, demoProfile.id));
        await tx
          .delete(leads)
          .where(eq(leads.businessProfileId, demoProfile.id));
        await tx
          .delete(chatSessions)
          .where(eq(chatSessions.businessProfileId, demoProfile.id));
        await tx
          .delete(products)
          .where(eq(products.businessProfileId, demoProfile.id));
        await tx.delete(faqs).where(eq(faqs.businessProfileId, demoProfile.id));
      }

      await this.upsertProducts(tx, demoProfile.id, command === 'reset');
      await this.upsertFaqs(tx, demoProfile.id, command === 'reset');

      return {
        command,
        businessSlug: demoProfile.slug,
        productCount: DEMO_PRODUCTS.length,
        faqCount: DEMO_FAQS.length,
      };
    });
  }

  private async upsertProducts(
    tx: Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0],
    businessProfileId: string,
    isReset: boolean,
  ): Promise<void> {
    const existing = isReset
      ? []
      : await tx
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(
            and(
              eq(products.businessProfileId, businessProfileId),
              inArray(
                products.name,
                DEMO_PRODUCTS.map((product) => product.name),
              ),
            ),
          );
    const existingByName = new Map(
      existing.map((item) => [item.name, item.id]),
    );

    for (const product of DEMO_PRODUCTS) {
      const values = {
        businessProfileId,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        isAvailable: product.isAvailable,
        orderingInstruction: product.orderingInstruction,
        additionalNotes: product.additionalNotes,
        createdAt: product.createdAt,
        updatedAt: new Date(),
      };
      const existingId = existingByName.get(product.name);
      if (existingId) {
        await tx
          .update(products)
          .set(values)
          .where(
            and(
              eq(products.id, existingId),
              eq(products.businessProfileId, businessProfileId),
            ),
          );
      } else {
        await tx.insert(products).values({ id: product.id, ...values });
      }
    }
  }

  private async upsertFaqs(
    tx: Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0],
    businessProfileId: string,
    isReset: boolean,
  ): Promise<void> {
    const existing = isReset
      ? []
      : await tx
          .select({ id: faqs.id, question: faqs.question })
          .from(faqs)
          .where(
            and(
              eq(faqs.businessProfileId, businessProfileId),
              inArray(
                faqs.question,
                DEMO_FAQS.map((faq) => faq.question),
              ),
            ),
          );
    const existingByQuestion = new Map(
      existing.map((item) => [item.question, item.id]),
    );

    for (const faq of DEMO_FAQS) {
      const values = {
        businessProfileId,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        isActive: faq.isActive,
        createdAt: faq.createdAt,
        updatedAt: new Date(),
      };
      const existingId = existingByQuestion.get(faq.question);
      if (existingId) {
        await tx
          .update(faqs)
          .set(values)
          .where(
            and(
              eq(faqs.id, existingId),
              eq(faqs.businessProfileId, businessProfileId),
            ),
          );
      } else {
        await tx.insert(faqs).values({ id: faq.id, ...values });
      }
    }
  }

  private readDemoPassword(): string {
    const password = this.config.get<string>('DEMO_USER_PASSWORD');
    if (
      typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') < 8 ||
      Buffer.byteLength(password, 'utf8') > 72 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      throw new Error(
        'DEMO_USER_PASSWORD must contain 8-72 bytes with letters and numbers',
      );
    }
    return password;
  }

  private assertResetAllowed(): void {
    if (this.config.get<boolean>('DEMO_DATA_RESET_ON_DEPLOY') !== true) {
      throw new Error(
        'Demo reset refused: DEMO_DATA_RESET_ON_DEPLOY must be true',
      );
    }
  }
}
