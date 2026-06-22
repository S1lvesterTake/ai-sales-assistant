import { BusinessProfileService } from './business-profile.service';
import { PublicBusinessController } from './public-business.controller';
import type { BusinessSlugParamDto } from './dto/business-slug-param.dto';

const SLUG = 'warung-test';

function makeController() {
  const service = {
    getPublic: jest
      .fn()
      .mockResolvedValue({ slug: SLUG, businessName: 'Warung Test' }),
  } as unknown as jest.Mocked<BusinessProfileService>;

  return { controller: new PublicBusinessController(service), service };
}

describe('PublicBusinessController', () => {
  it('get() delegates to service.getPublic with the slug param', async () => {
    const { controller, service } = makeController();
    const params: BusinessSlugParamDto = { businessSlug: SLUG };

    const result = await controller.get(params);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getPublic).toHaveBeenCalledWith(SLUG);
    expect(result).toMatchObject({ slug: SLUG });
  });
});
