import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthRepository, PublicUser, StoredUser } from './auth.repository';
import { AuthService } from './auth.service';

type CreateUserInput = Parameters<AuthRepository['create']>[0];

describe('AuthService', () => {
  const publicUser = {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300001',
    name: 'Budi',
    email: 'budi@example.com',
    isDemo: false,
  };

  function createService(repositoryOverrides: Partial<AuthRepository> = {}) {
    let createdInput: CreateUserInput | undefined;
    const createUser = jest.fn(
      (input: CreateUserInput): Promise<PublicUser> => {
        createdInput = input;
        return Promise.resolve(publicUser);
      },
    );
    const findByEmail = jest.fn().mockResolvedValue(null);
    const findPublicById = jest.fn().mockResolvedValue(publicUser);
    const repository = {
      create: createUser,
      findByEmail,
      findPublicById,
      ...repositoryOverrides,
    } as unknown as jest.Mocked<AuthRepository>;
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    } as unknown as jest.Mocked<JwtService>;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(3600),
    } as unknown as ConfigService;
    return {
      createUser,
      getCreatedInput: () => createdInput,
      repository,
      service: new AuthService(repository, jwt, config),
    };
  }

  it('registers a normalized non-demo user with a password hash', async () => {
    const { createUser, getCreatedInput, service } = createService();

    const session = await service.register({
      name: '  Budi  ',
      email: 'BUDI@Example.COM',
      password: 'Password123',
    });

    expect(createUser).toHaveBeenCalledTimes(1);
    const input = getCreatedInput();
    expect(input?.name).toBe('Budi');
    expect(input?.email).toBe('budi@example.com');
    await expect(
      bcrypt.compare('Password123', input?.passwordHash ?? ''),
    ).resolves.toBe(true);
    expect(session).toMatchObject({
      accessToken: 'signed-token',
      user: publicUser,
    });
  });

  it('rejects an existing email before hashing a new password', async () => {
    const storedUser = {
      ...publicUser,
      passwordHash: 'stored',
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StoredUser;
    const { createUser, service } = createService({
      findByEmail: jest.fn().mockResolvedValue(storedUser),
    });

    await expect(
      service.register({
        name: 'Budi',
        email: publicUser.email,
        password: 'Password123',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns the same generic error for an unknown account', async () => {
    const { service } = createService();

    try {
      await service.login({
        email: 'unknown@example.com',
        password: 'Password123',
      });
      throw new Error('Expected login to fail');
    } catch (error) {
      expect(error).toMatchObject({ status: 401 });
      expect(JSON.stringify(error)).toContain('INVALID_CREDENTIALS');
    }
  });
});
