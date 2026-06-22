import { DatabaseService } from '../../database/database.service';
import { PromptBuilderService } from './prompt-builder.service';

const BIZ_ID = '019b9d80-0000-0000-0000-000000000001';

function makeDb(limitValues: unknown[] = []) {
  let callIndex = 0;
  const limit = jest.fn().mockImplementation(() => {
    const value = limitValues[callIndex] ?? [];
    callIndex++;
    return Promise.resolve(value);
  });
  return {
    database: {
      db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit,
      },
    } as unknown as DatabaseService,
    limit,
  };
}

const mockProfile = {
  businessName: 'Warung Kopi Budi',
  description: 'Kopi enak dan terjangkau',
  category: 'F&B',
  location: 'Jakarta',
  operatingHours: '08:00-22:00',
  mainOffer: 'Kopi susu gula aren',
  whatsappNumber: '6281234567890',
};

const mockProduct = {
  name: 'Kopi Susu',
  description: 'Kopi dengan susu segar',
  price: 18000,
  isAvailable: true,
};

const mockFaq = {
  question: 'Apakah ada free ongkir?',
  answer: 'Ya, untuk pembelian di atas Rp50.000',
};

describe('PromptBuilderService', () => {
  describe('buildContext()', () => {
    it('returns systemPrompt and empty context when DB returns no data', async () => {
      // empty message → no keywords → 3 fallback limit() calls: profile, products, faqs
      const { database } = makeDb([[], [], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(result.systemPrompt).toContain('AI Sales Assistant');
      expect(result.context).toBe('');
    });

    it('includes business info when profile is found', async () => {
      // empty message → 3 calls: profile, fallback_products, fallback_faqs
      const { database } = makeDb([[mockProfile], [], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(result.context).toContain('Warung Kopi Budi');
      expect(result.context).toContain('Jakarta');
      expect(result.context).toContain('6281234567890');
    });

    it('includes product info in context when products are returned', async () => {
      // empty message → 3 calls: profile, fallback_products (returns product), fallback_faqs
      const { database } = makeDb([[mockProfile], [mockProduct], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(result.context).toContain('Kopi Susu');
      expect(result.context).toContain('18.000');
    });

    it('includes FAQ info in context when faqs are returned', async () => {
      // empty message → 3 calls: profile, fallback_products, fallback_faqs (returns faq)
      const { database } = makeDb([[mockProfile], [], [mockFaq]]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(result.context).toContain('Apakah ada free ongkir?');
      expect(result.context).toContain('Ya, untuk pembelian');
    });

    it('marks unavailable products with [Tidak Tersedia]', async () => {
      const unavailableProduct = { ...mockProduct, isAvailable: false };
      const { database } = makeDb([[mockProfile], [unavailableProduct], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(result.context).toContain('[Tidak Tersedia]');
    });

    it('uses keyword path and returns early when keyword match finds products', async () => {
      // message "harga kopi susu" → keywords present
      // calls: profile, keyword_products (returns match → early return), keyword_faqs (returns match)
      const { database } = makeDb([[mockProfile], [mockProduct], [mockFaq]]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, 'harga kopi susu');

      expect(result.context).toContain('Kopi Susu');
      expect(result.context).toContain('Apakah ada free ongkir?');
    });

    it('falls back to all products when keyword query returns empty', async () => {
      // Promise.all interleaves: profile, keyword_products, keyword_faqs, fallback_products, fallback_faqs
      const { database } = makeDb([[mockProfile], [], [], [mockProduct], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, 'harga kopi');

      expect(result.context).toContain('Kopi Susu');
    });

    it('always returns a systemPrompt string', async () => {
      const { database } = makeDb([[], [], []]);
      const service = new PromptBuilderService(database);

      const result = await service.buildContext(BIZ_ID, '');

      expect(typeof result.systemPrompt).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
    });
  });
});
