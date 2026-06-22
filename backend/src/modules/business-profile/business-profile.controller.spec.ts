import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessProfileController } from './business-profile.controller';
import { BusinessProfileService } from './business-profile.service';
import type { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import type { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const principal: AuthenticatedUser = {
  userId: USER_ID,
  email: 'test@test.com',
  isDemo: false,
};

function makeController() {
  const service = {
    create: jest.fn().mockResolvedValue({}),
    getPrivate: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<BusinessProfileService>;

  return { controller: new BusinessProfileController(service), service };
}

describe('BusinessProfileController', () => {
  it('has JwtAuthGuard applied at the class level', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const guards: unknown[] = Reflect.getOwnMetadata(
      '__guards__',
      BusinessProfileController,
    );
    expect(guards).toBeDefined();
    expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
  });

  it('create() delegates to service.create with userId and input', async () => {
    const { controller, service } = makeController();
    const input = {
      slug: 'warung-test',
      businessName: 'Warung Test',
      whatsappNumber: '081234567890',
    } as CreateBusinessProfileDto;

    await controller.create(principal, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.create).toHaveBeenCalledWith(USER_ID, input);
  });

  it('get() delegates to service.getPrivate with userId', async () => {
    const { controller, service } = makeController();

    await controller.get(principal);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getPrivate).toHaveBeenCalledWith(USER_ID);
  });

  it('update() delegates to service.update with the full principal and input', async () => {
    const { controller, service } = makeController();
    const input = { businessName: 'New Name' } as UpdateBusinessProfileDto;

    await controller.update(principal, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.update).toHaveBeenCalledWith(principal, input);
  });
});
