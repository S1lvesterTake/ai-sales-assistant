import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema';

export type StoredUser = typeof users.$inferSelect;
export type PublicUser = Pick<StoredUser, 'email' | 'id' | 'isDemo' | 'name'>;

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string): Promise<StoredUser | null> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const [user] = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isDemo: users.isDemo,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<PublicUser> {
    const [user] = await this.database.db
      .insert(users)
      .values({ ...input, isDemo: false })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        isDemo: users.isDemo,
      });
    if (!user) throw new Error('User insert returned no row');
    return user;
  }
}
