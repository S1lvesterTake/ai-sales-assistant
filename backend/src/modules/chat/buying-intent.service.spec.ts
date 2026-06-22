import { BuyingIntentService } from './buying-intent.service';

describe('BuyingIntentService', () => {
  const service = new BuyingIntentService();

  describe('detect()', () => {
    it('detects buying intent from Indonesian keywords in the combined message', () => {
      const result = service.detect('mau beli kopi', 'Silahkan pesan sekarang');

      expect(result.isBuyingIntentDetected).toBe(true);
      expect(result.shouldShowWhatsappCta).toBe(true);
    });

    it('returns no buying intent when no keywords match', () => {
      const result = service.detect('apa kabar?', 'Kabar baik');

      expect(result.isBuyingIntentDetected).toBe(false);
      expect(result.shouldShowWhatsappCta).toBe(false);
    });

    it('detects buying intent from English keywords in the combined message', () => {
      const result = service.detect(
        'I want to buy this',
        'The price is Rp 20,000',
      );

      expect(result.isBuyingIntentDetected).toBe(true);
    });

    it('returns a result object with all expected keys', () => {
      const result = service.detect(
        'berapa harga kopi susu?',
        'Harganya Rp 18.000',
      );

      expect(result).toHaveProperty('isBuyingIntentDetected');
      expect(result).toHaveProperty('isEnglish');
      expect(result).toHaveProperty('shouldShowWhatsappCta');
      expect(result).toHaveProperty('shouldCaptureLead');
      expect(result).toHaveProperty('detectedProduct');
    });

    it('sets shouldCaptureLead true when buying intent + lead capture keywords present', () => {
      const result = service.detect(
        'saya mau pesan, boleh minta nomor kontaknya?',
        'Tentu, silahkan hubungi kami',
      );

      expect(result.isBuyingIntentDetected).toBe(true);
      expect(result.shouldCaptureLead).toBe(true);
    });

    it('sets shouldCaptureLead false when buying intent but no lead capture keywords', () => {
      const result = service.detect('mau beli kopi', 'Silahkan pesan');

      expect(result.shouldCaptureLead).toBe(false);
    });

    it('extracts detectedProduct from price mention in AI response', () => {
      const result = service.detect(
        'berapa harga kopi?',
        'harga Kopi Susu adalah Rp 18.000',
      );

      expect(result.detectedProduct).toBe('Kopi Susu');
    });

    it('returns null detectedProduct when no product name found', () => {
      const result = service.detect('hai', 'Halo, ada yang bisa dibantu?');

      expect(result.detectedProduct).toBeNull();
    });
  });
});
