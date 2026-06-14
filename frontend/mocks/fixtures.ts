import type { AuthSession, AuthUser } from "@/types/auth";
import type { BusinessProfile, PublicBusiness } from "@/types/business";
import type { ChatMessage, ChatReply, ChatSession } from "@/types/chat";
import type {
  DashboardSummary,
  RecentConversation,
  TopQuestion,
} from "@/types/dashboard";
import type { Faq } from "@/types/faq";
import type { Lead } from "@/types/lead";
import type { Product } from "@/types/product";

export const FIXED_NOW = "2026-06-14T08:00:00.000Z";

export const demoUser: AuthUser = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300001",
  name: "Pemilik Kopi Senja",
  email: "demo@kopisenja.id",
  isDemo: true,
};

export const demoAuthSession: AuthSession = {
  accessToken: "demo-token",
  expiresAt: "2026-06-15T08:00:00.000Z",
  user: demoUser,
};

export const publicBusinessFixture: PublicBusiness = {
  slug: "kopi-senja-umkm",
  businessName: "Kopi Senja UMKM",
  description: "Kedai kopi lokal dengan racikan hangat untuk menemani sore.",
  category: "Kuliner",
  location: "Makassar, Sulawesi Selatan",
  operatingHours: "Setiap hari, 10.00-22.00 WITA",
  mainOffer: "Kopi Susu Gula Aren mulai Rp18.000",
  ctaMessage: "Pesan Kopi Senja melalui WhatsApp.",
  suggestedQuestions: [
    "Berapa harga Kopi Susu Gula Aren?",
    "Apakah bisa pesan untuk acara?",
    "Jam bukanya sampai kapan?",
  ],
};

export const businessProfileFixture: BusinessProfile = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300002",
  businessName: publicBusinessFixture.businessName,
  slug: publicBusinessFixture.slug,
  description: "Kedai kopi lokal dengan racikan hangat untuk menemani sore.",
  category: "Kuliner",
  whatsappNumber: "6281234567890",
  location: "Makassar, Sulawesi Selatan",
  operatingHours: "Setiap hari, 10.00-22.00 WITA",
  mainOffer: "Kopi Susu Gula Aren mulai Rp18.000",
  ctaMessage: "Pesan Kopi Senja melalui WhatsApp.",
  createdAt: "2026-05-01T08:00:00.000Z",
  updatedAt: FIXED_NOW,
};

export const productFixtures: Product[] = [
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300010",
    name: "Kopi Susu Gula Aren",
    description: "Espresso, susu segar, dan gula aren.",
    price: 18000,
    category: "Kopi",
    isAvailable: true,
    orderingInstruction: "Tersedia panas atau dingin.",
    additionalNotes: "Tingkat gula dapat disesuaikan.",
    createdAt: "2026-05-02T08:00:00.000Z",
    updatedAt: FIXED_NOW,
  },
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300011",
    name: "Cold Brew Senja",
    description: "Cold brew ringan dengan aroma cokelat.",
    price: 22000,
    category: "Kopi",
    isAvailable: true,
    orderingInstruction: "Disajikan dingin.",
    createdAt: "2026-05-03T08:00:00.000Z",
    updatedAt: FIXED_NOW,
  },
];

export const faqFixtures: Faq[] = [
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300020",
    question: "Apakah bisa pesan untuk acara?",
    answer: "Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.",
    category: "Pemesanan",
    isActive: true,
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: FIXED_NOW,
  },
];

export const leadFixtures: Lead[] = [
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300030",
    chatSessionId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300040",
    name: "Andi",
    phone: "6281234567890",
    interestSummary: "Tertarik paket kopi untuk rapat kantor.",
    status: "new",
    source: "chatbot",
    createdAt: "2026-06-14T07:30:00.000Z",
    updatedAt: FIXED_NOW,
  },
];

export const chatSessionFixture: ChatSession = {
  sessionId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300040",
  sessionToken: "mock-chat-session-token",
  expiresAt: "2026-06-14T10:00:00.000Z",
};

export const chatMessageFixtures: ChatMessage[] = [
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300050",
    clientMessageId: "019b9d80-7a2e-7b4b-8dc1-7a44b63001c1",
    processingStatus: "completed",
    role: "customer",
    message: "Kak, harga kopi susu gula aren berapa?",
    createdAt: "2026-06-14T07:40:00.000Z",
  },
  {
    id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300051",
    replyToMessageId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300050",
    role: "assistant",
    message: "Harga Kopi Susu Gula Aren adalah Rp18.000.",
    createdAt: "2026-06-14T07:40:01.000Z",
  },
];

export const chatReplyFixture: ChatReply = {
  clientMessageId: "019b9d80-7a2e-7b4b-8dc1-7a44b63001c1",
  processingStatus: "completed",
  message:
    "Harga Kopi Susu Gula Aren adalah Rp18.000. Produk tersedia dan bisa dipesan melalui WhatsApp.",
  shouldShowWhatsappCta: true,
  isBuyingIntentDetected: true,
  shouldCaptureLead: false,
  whatsappUrl:
    "https://wa.me/6281234567890?text=Halo%2C%20saya%20tertarik%20dengan%20Kopi%20Susu%20Gula%20Aren",
  detectedProduct: "Kopi Susu Gula Aren",
};

export const dashboardSummaryFixture: DashboardSummary = {
  totalLeads: 24,
  newLeads: 5,
  totalChatSessions: 86,
  whatsappClicks: 31,
};

export const recentConversationFixtures: RecentConversation[] = [
  {
    sessionId: chatSessionFixture.sessionId,
    customerName: "Andi",
    lastMessage: chatReplyFixture.message ?? "",
    lastMessageAt: "2026-06-14T07:40:01.000Z",
  },
];

export const topQuestionFixtures: TopQuestion[] = [
  { question: "Berapa harga Kopi Susu Gula Aren?", count: 18 },
  { question: "Jam buka Kopi Senja?", count: 12 },
];
