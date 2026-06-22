import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';
import type { CreateFaqDto } from './dto/create-faq.dto';
import type { FaqQueryDto } from './dto/faq-query.dto';
import type { UpdateFaqDto } from './dto/update-faq.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const FAQ_ID = '019b9d80-0000-0000-0000-000000000010';
const principal: AuthenticatedUser = {
  userId: USER_ID,
  email: 'test@test.com',
  isDemo: false,
};

function makeController() {
  const service = {
    create: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    get: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FaqsService>;

  return { controller: new FaqsController(service), service };
}

describe('FaqsController', () => {
  it('has JwtAuthGuard applied at the class level', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const guards: unknown[] = Reflect.getOwnMetadata(
      '__guards__',
      FaqsController,
    );
    expect(guards).toBeDefined();
    expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
  });

  it('create() delegates to service.create with userId and input', async () => {
    const { controller, service } = makeController();
    const input = {
      question: 'Bisa pesan untuk acara?',
      answer: 'Bisa.',
    } as CreateFaqDto;

    await controller.create(principal, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.create).toHaveBeenCalledWith(USER_ID, input);
  });

  it('list() delegates to service.list with userId and query', async () => {
    const { controller, service } = makeController();
    const query = { page: 1, limit: 20 } as FaqQueryDto;

    await controller.list(principal, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.list).toHaveBeenCalledWith(USER_ID, query);
  });

  it('get() delegates to service.get with userId and FAQ id', async () => {
    const { controller, service } = makeController();

    await controller.get(principal, FAQ_ID);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.get).toHaveBeenCalledWith(USER_ID, FAQ_ID);
  });

  it('update() delegates to service.update with userId, id, and input', async () => {
    const { controller, service } = makeController();
    const input = { answer: 'Updated.' } as UpdateFaqDto;

    await controller.update(principal, FAQ_ID, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.update).toHaveBeenCalledWith(USER_ID, FAQ_ID, input);
  });

  it('remove() calls service.remove and returns null', async () => {
    const { controller, service } = makeController();

    const result = await controller.remove(principal, FAQ_ID);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.remove).toHaveBeenCalledWith(USER_ID, FAQ_ID);
    expect(result).toBeNull();
  });
});
