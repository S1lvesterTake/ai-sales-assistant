import type { Lead } from "@/types/lead";

export interface DashboardSummary {
  totalLeads: number;
  newLeads: number;
  totalChatSessions: number;
  whatsappClicks: number;
}

export interface RecentConversation {
  sessionId: string;
  customerName: string | null;
  lastMessage: string;
  lastMessageAt: string;
}

export interface TopQuestion {
  question: string;
  count: number;
}

export type RecentLead = Lead;
