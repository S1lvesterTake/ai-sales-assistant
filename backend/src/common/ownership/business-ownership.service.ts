import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { businessProfiles } from '../../database/schema';

export interface BusinessOwnership {
  businessProfileId: string;
  userId: string;
}

@Injectable()
export class BusinessOwnershipService {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<BusinessOwnership | null> {
    const [profile] = await this.database.db
      .select({
        businessProfileId: businessProfiles.id,
        userId: businessProfiles.userId,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, userId))
      .limit(1);
    return profile ?? null;
  }
}
