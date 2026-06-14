import type { ChatSession } from "@/types/chat";

const STORAGE_PREFIX = "ai-sales-chat-session:";

function storageKey(businessSlug: string): string {
  return `${STORAGE_PREFIX}${businessSlug}`;
}

export function readStoredChatSession(
  businessSlug: string,
  storage: Storage,
  now = Date.now(),
): ChatSession | null {
  const rawValue = storage.getItem(storageKey(businessSlug));
  if (!rawValue) return null;

  try {
    const value = JSON.parse(rawValue) as Partial<ChatSession>;
    if (
      typeof value.sessionId !== "string" ||
      typeof value.sessionToken !== "string" ||
      typeof value.expiresAt !== "string" ||
      Number.isNaN(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= now
    ) {
      storage.removeItem(storageKey(businessSlug));
      return null;
    }

    return {
      sessionId: value.sessionId,
      sessionToken: value.sessionToken,
      expiresAt: value.expiresAt,
    };
  } catch {
    storage.removeItem(storageKey(businessSlug));
    return null;
  }
}

export function storeChatSession(
  businessSlug: string,
  session: ChatSession,
  storage: Storage,
): void {
  storage.setItem(storageKey(businessSlug), JSON.stringify(session));
}

export function clearStoredChatSession(
  businessSlug: string,
  storage: Storage,
): void {
  storage.removeItem(storageKey(businessSlug));
}
