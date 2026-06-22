import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import type {
  DashboardConversationMessagesQueryDto,
  DashboardWidgetQueryDto,
} from './dto/dashboard-query.dto';

const USER_ID = '019b9d80-0000-0000-0000-000000000099';
const SESSION_ID = '019b9d80-0000-0000-0000-000000000010';
const principal: AuthenticatedUser = {
  userId: USER_ID,
  email: 'test@test.com',
  isDemo: false,
};

function makeController() {
  const service = {
    getSummary: jest.fn().mockResolvedValue({}),
    getRecentLeads: jest.fn().mockResolvedValue({ data: [] }),
    getRecentConversations: jest.fn().mockResolvedValue({ data: [] }),
    getTopQuestions: jest.fn().mockResolvedValue({ data: [] }),
    getConversationMessages: jest
      .fn()
      .mockResolvedValue({ data: [], meta: {} }),
  } as unknown as jest.Mocked<DashboardService>;

  return { controller: new DashboardController(service), service };
}

describe('DashboardController', () => {
  it('has JwtAuthGuard applied at the class level', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const guards: unknown[] = Reflect.getOwnMetadata(
      '__guards__',
      DashboardController,
    );
    expect(guards).toBeDefined();
    expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
  });

  it('getSummary() delegates to service.getSummary with userId', () => {
    const { controller, service } = makeController();

    void controller.getSummary(principal);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getSummary).toHaveBeenCalledWith(USER_ID);
  });

  it('getRecentLeads() delegates to service.getRecentLeads with userId and limit', () => {
    const { controller, service } = makeController();
    const query = { limit: 10 } as DashboardWidgetQueryDto;

    void controller.getRecentLeads(principal, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getRecentLeads).toHaveBeenCalledWith(USER_ID, 10);
  });

  it('getRecentConversations() delegates to service with userId and limit', () => {
    const { controller, service } = makeController();
    const query = { limit: 5 } as DashboardWidgetQueryDto;

    void controller.getRecentConversations(principal, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getRecentConversations).toHaveBeenCalledWith(USER_ID, 5);
  });

  it('getTopQuestions() delegates to service with userId and limit', () => {
    const { controller, service } = makeController();
    const query = { limit: 5 } as DashboardWidgetQueryDto;

    void controller.getTopQuestions(principal, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getTopQuestions).toHaveBeenCalledWith(USER_ID, 5);
  });

  it('getConversationMessages() delegates to service with userId, sessionId, page, limit', () => {
    const { controller, service } = makeController();
    const query = {
      page: 2,
      limit: 10,
    } as DashboardConversationMessagesQueryDto;

    void controller.getConversationMessages(principal, SESSION_ID, query);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getConversationMessages).toHaveBeenCalledWith(
      USER_ID,
      SESSION_ID,
      2,
      10,
    );
  });
});
