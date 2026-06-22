import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const LEAD_ID = '019b9d80-0000-0000-0000-000000000010';
const SESSION_ID = '019b9d80-0000-0000-0000-000000000020';
const SLUG = 'warung-pak-budi';
const principal: AuthenticatedUser = {
  userId: USER_ID,
  email: 'test@test.com',
  isDemo: false,
};

function makeController() {
  const service = {
    createViaJwt: jest.fn().mockResolvedValue({}),
    createViaChatToken: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<LeadsService>;

  return { controller: new LeadsController(service), service };
}

describe('LeadsController', () => {
  it('create() delegates to service.createViaJwt with userId and input', async () => {
    const { controller, service } = makeController();
    const input = { phone: '6281234567890', name: 'Budi' } as CreateLeadDto;

    await controller.create(principal, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.createViaJwt).toHaveBeenCalledWith(USER_ID, input);
  });

  it('createFromChat() delegates to service.createViaChatToken with slug, sessionId, token, and input', async () => {
    const { controller, service } = makeController();
    const input = {
      phone: '6281234567890',
      chatSessionId: SESSION_ID,
    } as CreateLeadDto;

    await controller.createFromChat(SLUG, input, 'raw-token');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.createViaChatToken).toHaveBeenCalledWith(
      SLUG,
      SESSION_ID,
      'raw-token',
      input,
    );
  });

  it('createFromChat() throws 401 when X-Chat-Session-Token header is absent', () => {
    const { controller } = makeController();
    const input = {
      phone: '6281234567890',
      chatSessionId: SESSION_ID,
    } as CreateLeadDto;

    expect(() => controller.createFromChat(SLUG, input, undefined)).toThrow();
  });

  it('updateStatus() delegates to service.updateStatus with userId, leadId, and input', async () => {
    const { controller, service } = makeController();
    const input = { status: 'contacted' } as unknown as UpdateLeadStatusDto;

    await controller.updateStatus(principal, LEAD_ID, input);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.updateStatus).toHaveBeenCalledWith(USER_ID, LEAD_ID, input);
  });

  it('list() delegates to service.list with userId and query', async () => {
    const { controller, service } = makeController();

    await controller.list(principal, {});

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.list).toHaveBeenCalledWith(USER_ID, {});
  });

  it('get() delegates to service.get with userId and leadId', async () => {
    const { controller, service } = makeController();

    await controller.get(principal, LEAD_ID);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.get).toHaveBeenCalledWith(USER_ID, LEAD_ID);
  });
});
