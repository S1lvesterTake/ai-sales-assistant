import type { PaginationQuery } from "@/types/api";

export type ChatRole = "customer" | "assistant" | "system";
export type ChatProcessingStatus = "pending" | "completed" | "failed";

export interface ChatSession {
  sessionId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  message: string;
  createdAt: string;
  clientMessageId?: string;
  replyToMessageId?: string;
  processingStatus?: ChatProcessingStatus;
}

export interface SendChatMessageInput {
  clientMessageId: string;
  message: string;
}

export interface ChatReply {
  clientMessageId: string;
  processingStatus: ChatProcessingStatus;
  message?: string;
  shouldShowWhatsappCta?: boolean;
  isBuyingIntentDetected?: boolean;
  shouldCaptureLead?: boolean;
  whatsappUrl?: string;
  detectedProduct?: string | null;
}

export type ChatHistoryQuery = PaginationQuery;
