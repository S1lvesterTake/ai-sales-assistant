import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import type { WhatsappLinkQueryDto } from './dto/whatsapp-link-query.dto';
import type { TrackWhatsappClickInput } from './dto/whatsapp-click.dto';

const SLUG = 'warung-pak-budi';
const SESSION_ID = '019b9d80-0000-0000-0000-000000000020';

function makeController() {
  const service = {
    generateLink: jest
      .fn()
      .mockResolvedValue({ url: 'https://wa.me/6281234567890' }),
    trackClick: jest.fn().mockResolvedValue({
      id: '019b9d80-0000-0000-0000-000000000099',
      clickedAt: '2026-01-01T00:00:00.000Z',
    }),
  } as unknown as jest.Mocked<WhatsappService>;

  return { controller: new WhatsappController(service), service };
}

describe('WhatsappController', () => {
  it('has no class-level guard (public controller)', () => {
    const guards: unknown = Reflect.getOwnMetadata(
      '__guards__',
      WhatsappController,
    );
    expect(guards).toBeUndefined();
  });

  it('getLink() delegates to service.generateLink with slug, sessionId, leadId, and token', async () => {
    const { controller, service } = makeController();
    const params = { businessSlug: SLUG };
    const query = {
      sessionId: SESSION_ID,
      leadId: undefined,
    } as WhatsappLinkQueryDto;

    await controller.getLink(params, query, 'raw-token');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.generateLink).toHaveBeenCalledWith(
      SLUG,
      SESSION_ID,
      undefined,
      'raw-token',
    );
  });

  it('trackClick() delegates to service.trackClick with slug, sessionId, leadId, and token', async () => {
    const { controller, service } = makeController();
    const params = { businessSlug: SLUG };
    const input = {
      sessionId: SESSION_ID,
      leadId: undefined,
    } as TrackWhatsappClickInput;

    await controller.trackClick(params, input, 'raw-token');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.trackClick).toHaveBeenCalledWith(
      SLUG,
      SESSION_ID,
      undefined,
      'raw-token',
    );
  });
});
