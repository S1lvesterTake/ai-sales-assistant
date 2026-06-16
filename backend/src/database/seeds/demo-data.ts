export const DEMO_USER_ID = '019b9d80-7a2e-7b4b-8dc1-7a44b6300001';
export const DEMO_PROFILE_ID = '019b9d80-7a2e-7b4b-8dc1-7a44b6300002';
export const DEMO_EMAIL = 'demo@kopisenja.id';
export const DEMO_USER_NAME = 'Pemilik Kopi Senja';

export const DEMO_PROFILE = {
  slug: 'kopi-senja-umkm',
  businessName: 'Kopi Senja UMKM',
  description: 'Kedai kopi lokal dengan racikan hangat untuk menemani sore.',
  category: 'Kuliner',
  whatsappNumber: '6281234567890',
  location: 'Makassar, Sulawesi Selatan',
  operatingHours: 'Setiap hari, 10.00-22.00 WITA',
  mainOffer: 'Kopi Susu Gula Aren mulai Rp18.000',
  ctaMessage: 'Pesan Kopi Senja melalui WhatsApp.',
} as const;

export const DEMO_PRODUCTS = [
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300010',
    name: 'Kopi Susu Gula Aren',
    description: 'Espresso, susu segar, dan gula aren.',
    price: 18_000,
    category: 'Kopi',
    isAvailable: true,
    orderingInstruction: 'Tersedia panas atau dingin.',
    additionalNotes: 'Tingkat gula dapat disesuaikan.',
    createdAt: new Date('2026-05-05T08:00:00.000Z'),
  },
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300011',
    name: 'Es Kopi Hitam',
    description: 'Kopi hitam dingin dengan rasa tegas dan ringan.',
    price: 15_000,
    category: 'Kopi',
    isAvailable: true,
    orderingInstruction: 'Disajikan dingin.',
    additionalNotes: null,
    createdAt: new Date('2026-05-04T08:00:00.000Z'),
  },
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300012',
    name: 'Paket Kopi + Pancong',
    description: 'Paket kopi susu dan pancong hangat.',
    price: 28_000,
    category: 'Paket',
    isAvailable: true,
    orderingInstruction: 'Pilih kopi panas atau dingin.',
    additionalNotes: null,
    createdAt: new Date('2026-05-03T08:00:00.000Z'),
  },
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300013',
    name: 'Ketan Susu',
    description: 'Ketan hangat dengan susu dan topping pilihan.',
    price: 12_000,
    category: 'Camilan',
    isAvailable: true,
    orderingInstruction: 'Tanyakan topping yang tersedia.',
    additionalNotes: null,
    createdAt: new Date('2026-05-02T08:00:00.000Z'),
  },
] as const;

export const DEMO_FAQS = [
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300020',
    question: 'Apakah bisa pesan untuk acara?',
    answer: 'Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.',
    category: 'Pemesanan',
    isActive: true,
    createdAt: new Date('2026-05-06T08:00:00.000Z'),
  },
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300021',
    question: 'Jam buka Kopi Senja?',
    answer: 'Kopi Senja buka setiap hari pukul 10.00-22.00 WITA.',
    category: 'Operasional',
    isActive: true,
    createdAt: new Date('2026-05-05T08:00:00.000Z'),
  },
  {
    id: '019b9d80-7a2e-7b4b-8dc1-7a44b6300022',
    question: 'Apakah tersedia pesan antar?',
    answer: 'Pesan antar dapat dikonfirmasi melalui WhatsApp.',
    category: 'Pemesanan',
    isActive: true,
    createdAt: new Date('2026-05-04T08:00:00.000Z'),
  },
] as const;
