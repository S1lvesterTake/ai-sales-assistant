import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './jwt.strategy';

const USER_ID = '019b9d80-7a2e-7b4b-8dc1-7a44b6300001';

function makeStrategy(userFound = true) {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  const repository = {
    findPublicById: jest.fn().mockResolvedValue(
      userFound
        ? {
            id: USER_ID,
            name: 'Budi',
            email: 'budi@example.com',
            isDemo: false,
          }
        : null,
    ),
  } as unknown as AuthRepository;

  return { strategy: new JwtStrategy(config, repository), repository };
}

describe('JwtStrategy', () => {
  describe('validate()', () => {
    it('returns AuthenticatedUser when payload.sub is a valid UUID and user exists', async () => {
      const { strategy } = makeStrategy();

      const result = await strategy.validate({ sub: USER_ID });

      expect(result).toEqual({
        userId: USER_ID,
        email: 'budi@example.com',
        isDemo: false,
      });
    });

    it('throws UnauthorizedException when payload.sub is not a string', async () => {
      const { strategy } = makeStrategy();

      await expect(strategy.validate({ sub: 123 })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when payload.sub is not a UUID', async () => {
      const { strategy } = makeStrategy();

      await expect(strategy.validate({ sub: 'not-a-uuid' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user is not found in the database', async () => {
      const { strategy } = makeStrategy(false);

      await expect(strategy.validate({ sub: USER_ID })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
