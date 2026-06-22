import { DatabaseService } from '../../database/database.service';
import { WhatsappRepository } from './whatsapp.repository';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';
const CLICK_ID = '019b9d80-0000-0000-0000-000000000099';

const mockClick = {
  id: CLICK_ID,
  businessProfileId: BIZ_ID,
  chatSessionId: null,
  leadId: null,
  clickedAt: new Date('2026-01-01T00:00:00Z'),
};

function makeDb(dbOverrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    db: {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      ...dbOverrides,
    },
  } as unknown as DatabaseService;
}

describe('WhatsappRepository', () => {
  describe('createClick()', () => {
    it('inserts and returns the click event', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([mockClick]),
      });
      const repo = new WhatsappRepository(database);

      const result = await repo.createClick({
        businessProfileId: BIZ_ID,
        chatSessionId: null,
        leadId: null,
      });

      expect(result).toEqual(mockClick);
    });

    it('throws when the DB insert returns no row', async () => {
      const database = makeDb({
        returning: jest.fn().mockResolvedValue([]),
      });
      const repo = new WhatsappRepository(database);

      await expect(
        repo.createClick({
          businessProfileId: BIZ_ID,
          chatSessionId: null,
          leadId: null,
        }),
      ).rejects.toThrow('WhatsApp click insert returned no row');
    });
  });
});
