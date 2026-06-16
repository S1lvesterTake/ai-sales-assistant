import { Injectable } from '@nestjs/common';

const INDONESIAN_KEYWORDS = [
  'beli',
  'pesan',
  'order',
  'harga',
  'berapa',
  'minat',
  'tertarik',
  'ready',
  'tersedia',
  'kirim',
  'ongkir',
  'bayar',
  'promo',
  'daftar',
  'gabung',
  'kontak',
  'wa',
  'whatsapp',
];

const ENGLISH_KEYWORDS = [
  'buy',
  'order',
  'price',
  'how much',
  'interested',
  'available',
  'delivery',
  'payment',
  'promo',
  'book',
  'register',
  'join',
  'contact',
  'whatsapp',
];

const LEAD_CAPTURE_KEYWORDS = [
  'nama',
  'nomor',
  'kontak',
  'hubungi',
  'follow up',
  'name',
  'number',
  'contact',
];

export interface BuyingIntentResult {
  isBuyingIntentDetected: boolean;
  isEnglish: boolean;
  shouldShowWhatsappCta: boolean;
  shouldCaptureLead: boolean;
  detectedProduct: string | null;
}

@Injectable()
export class BuyingIntentService {
  detect(message: string, aiResponseMessage: string): BuyingIntentResult {
    const combined = `${message} ${aiResponseMessage}`.toLowerCase();

    const isEnglish = this.detectEnglish(message);

    const buyingKeywords = isEnglish ? ENGLISH_KEYWORDS : INDONESIAN_KEYWORDS;
    const isBuyingIntentDetected = buyingKeywords.some((keyword) =>
      combined.includes(keyword),
    );

    const shouldShowWhatsappCta = isBuyingIntentDetected;

    const shouldCaptureLead =
      isBuyingIntentDetected &&
      LEAD_CAPTURE_KEYWORDS.some((keyword) => combined.includes(keyword));

    const detectedProduct = this.detectProduct(aiResponseMessage);

    return {
      isBuyingIntentDetected,
      isEnglish,
      shouldShowWhatsappCta,
      shouldCaptureLead,
      detectedProduct,
    };
  }

  private detectEnglish(message: string): boolean {
    const englishPatterns = [
      /\b(hello|hi|hey|thanks|thank you|please|help|how|what|when|where|who|why|can|could|would|will|do|does|is|are|am|the|a|an|in|on|at|to|for|of|with|this|that|it|i|you|me|my|your)\b/i,
    ];

    const matchCount = englishPatterns.reduce((count, pattern) => {
      const matches = message.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    return matchCount >= 3;
  }

  private detectProduct(aiResponse: string): string | null {
    const productMatch = aiResponse.match(
      /(?:harga|price\s*(?:of)?)\s*([A-Za-z0-9\s&]+?)(?:\s*(?:adalah|is|Rp|\.|,|$))/i,
    );
    if (productMatch?.[1]) {
      return productMatch[1].trim();
    }

    const nameMatch = aiResponse.match(
      /\b(Kopi Susu Gula Aren|Es Kopi Hitam|Paket Kopi|Ketan Susu|[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/,
    );
    return nameMatch?.[1]?.trim() ?? null;
  }
}
