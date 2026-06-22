import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const PRODUCT_ID = '019b9d80-0000-0000-0000-000000000010';
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
  } as unknown as jest.Mocked<ProductsService>;

  return { controller: new ProductsController(service), service };
}

describe('ProductsController', () => {
  it('has JwtAuthGuard applied at the class level', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const guards: unknown[] = Reflect.getOwnMetadata(
      '__guards__',
      ProductsController,
    );
    expect(guards).toBeDefined();
    expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
  });

  it('create() delegates to service.create with userId and input', async () => {
    const { controller, service } = makeController();
    const input = { name: 'Kopi Susu', price: 18_000 } as CreateProductDto;

    await controller.create(principal, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.create).toHaveBeenCalledWith(USER_ID, input);
  });

  it('list() delegates to service.list with userId and query', async () => {
    const { controller, service } = makeController();
    const query = { page: 1, limit: 20 } as ProductQueryDto;

    await controller.list(principal, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.list).toHaveBeenCalledWith(USER_ID, query);
  });

  it('get() delegates to service.get with userId and product id', async () => {
    const { controller, service } = makeController();

    await controller.get(principal, PRODUCT_ID);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.get).toHaveBeenCalledWith(USER_ID, PRODUCT_ID);
  });
});
