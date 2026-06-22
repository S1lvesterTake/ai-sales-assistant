import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000001';
const principal: AuthenticatedUser = {
  userId: USER_ID,
  email: 'test@test.com',
  isDemo: false,
};

function makeController(
  overrides: Partial<Record<keyof AuthService, jest.Mock>> = {},
) {
  const service = {
    register: jest.fn().mockResolvedValue({ accessToken: 'tok' }),
    login: jest.fn().mockResolvedValue({ accessToken: 'tok' }),
    getCurrentUser: jest
      .fn()
      .mockResolvedValue({ id: USER_ID, email: 'test@test.com' }),
    ...overrides,
  } as unknown as jest.Mocked<AuthService>;

  return { controller: new AuthController(service), service };
}

describe('AuthController', () => {
  describe('register()', () => {
    it('delegates to service.register with the body input', async () => {
      const { controller, service } = makeController();
      const input: RegisterDto = {
        email: 'new@test.com',
        password: 'pass',
        name: 'Test',
      };

      await controller.register(input);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.register).toHaveBeenCalledWith(input);
    });
  });

  describe('login()', () => {
    it('delegates to service.login with the body input', async () => {
      const { controller, service } = makeController();
      const input: LoginDto = { email: 'test@test.com', password: 'pass' };

      await controller.login(input);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.login).toHaveBeenCalledWith(input);
    });
  });

  describe('getCurrentUser()', () => {
    it('returns the user when service resolves a user', async () => {
      const { controller } = makeController();

      const result = await controller.getCurrentUser(principal);

      expect(result).toMatchObject({ id: USER_ID });
    });

    it('throws NotFoundException when service returns null', async () => {
      const { controller } = makeController({
        getCurrentUser: jest.fn().mockResolvedValue(null),
      });

      await expect(controller.getCurrentUser(principal)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calls service.getCurrentUser with the principal userId', async () => {
      const { controller, service } = makeController();

      await controller.getCurrentUser(principal);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getCurrentUser).toHaveBeenCalledWith(USER_ID);
    });
  });
});
