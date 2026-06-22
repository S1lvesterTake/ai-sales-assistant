import { DatabaseService } from '../../database/database.service';
import { ChatSessionAuthService } from '../chat/chat-session-auth.service';
import { WhatsappClickRecord, WhatsappRepository } from './whatsapp.repository';
import { WhatsappService } from './whatsapp.service';

jest.mock('../../common/utils/slug', () => ({
  resolveBusinessBySlug: jest.fn(),
  resolveBusinessWithWhatsappBySlug: jest.fn(),
}));

import {
  resolveBusinessBySlug,
  resolveBusinessWithWhatsappBySlug,
} from '../../common/utils/slug';

const mockResolveBySlug = resolveBusinessBySlug as jest.MockedFunction<
  typeof resolveBusinessBySlug
>;
const mockResolveWithWhatsapp =
  resolveBusinessWithWhatsappBySlug as jest.MockedFunction<
    typeof resolveBusinessWithWhatsappBySlug
  >;

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const SLUG = 'warung-pak-budi';
const WA_NUMBER = '6281234567890';

function fakeClickEvent(
  overrides: Partial<WhatsappClickRecord> = {},
): WhatsappClickRecord {
  return {
    id: '019b9d80-0000-0000-0000-000000000099',
    businessProfileId: BIZ_ID,
    chatSessionId: null,
    leadId: null,
    clickedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService(
  repoOverrides: Partial<{ [K in keyof WhatsappRepository]: jest.Mock }> = {},
) {
  const repository = {
    createClick: jest.fn().mockResolvedValue(fakeClickEvent()),
    ...repoOverrides,
  } as unknown as jest.Mocked<WhatsappRepository>;

  const chatAuth = {
    authorize: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ChatSessionAuthService>;

  return {
    repository,
    chatAuth,
    service: new WhatsappService(
      repository,
      chatAuth,
      {} as unknown as DatabaseService, // not used; slug utils are mocked
    ),
  };
}

describe('WhatsappService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveWithWhatsapp.mockResolvedValue({
      id: BIZ_ID,
      slug: SLUG,
      whatsappNumber: WA_NUMBER,
    });
    mockResolveBySlug.mockResolvedValue({ id: BIZ_ID, slug: SLUG });
  });

  describe('generateLink()', () => {
    it('returns a WhatsApp URL for the business phone when called without context', async () => {
      const { service } = makeService();

      const result = await service.generateLink(SLUG);

      expect(mockResolveWithWhatsapp).toHaveBeenCalledWith(
        expect.anything(),
        SLUG,
      );
      expect(result.url).toContain(`wa.me/${WA_NUMBER}`);
    });

    it('throws 401 when a sessionId is provided without a rawToken', async () => {
      const { service } = makeService();

      await expect(
        service.generateLink(SLUG, 'session-123', undefined, undefined),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('passes through the chat auth check when sessionId + rawToken are both provided', async () => {
      const { chatAuth, service } = makeService();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { authorize } = chatAuth;

      await service.generateLink(SLUG, 'session-123', undefined, 'raw-token');

      expect(authorize).toHaveBeenCalledWith(
        'session-123',
        BIZ_ID,
        'raw-token',
      );
    });
  });

  describe('trackClick()', () => {
    it('creates a click event scoped to the resolved businessProfileId', async () => {
      const { repository, service } = makeService();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { createClick } = repository;

      await service.trackClick(SLUG);

      expect(createClick).toHaveBeenCalledWith(
        expect.objectContaining({ businessProfileId: BIZ_ID }),
      );
    });

    it('returns the click event id and clickedAt timestamp', async () => {
      const { service } = makeService();

      const result = await service.trackClick(SLUG);

      expect(result).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        clickedAt: expect.any(String),
      });
    });

    it('throws 401 when a sessionId is provided without a rawToken', async () => {
      const { service } = makeService();

      await expect(
        service.trackClick(SLUG, 'session-123', undefined, undefined),
      ).rejects.toMatchObject({ status: 401 });
    });
  });
});
