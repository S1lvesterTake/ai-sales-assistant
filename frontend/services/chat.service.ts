import {
  publicApiClient,
  toSearchParams,
  type ApiClient,
} from "@/services/api-client";
import type {
  ChatHistoryQuery,
  ChatMessage,
  ChatReply,
  ChatSession,
  SendChatMessageInput,
} from "@/types/chat";

function sessionPath(businessSlug: string, sessionId: string): string {
  return `/api/public/businesses/${encodeURIComponent(businessSlug)}/chat/sessions/${encodeURIComponent(sessionId)}`;
}

export const chatService = {
  createSession(businessSlug: string, client: ApiClient = publicApiClient) {
    return client.request<ChatSession>(
      `/api/public/businesses/${encodeURIComponent(businessSlug)}/chat/sessions`,
      { method: "POST" },
    );
  },
  sendMessage(
    businessSlug: string,
    sessionId: string,
    sessionToken: string,
    input: SendChatMessageInput,
    client: ApiClient = publicApiClient,
  ) {
    return client.request<ChatReply>(
      `${sessionPath(businessSlug, sessionId)}/messages`,
      { method: "POST", body: input, sessionToken },
    );
  },
  getHistory(
    businessSlug: string,
    sessionId: string,
    sessionToken: string,
    query: ChatHistoryQuery = {},
    client: ApiClient = publicApiClient,
  ) {
    return client.requestPage<ChatMessage>(
      `${sessionPath(businessSlug, sessionId)}/messages${toSearchParams(query)}`,
      { sessionToken },
    );
  },
};
