import {
  clearStoredChatSession,
  readStoredChatSession,
  storeChatSession,
} from "@/lib/chat-session";
import { chatSessionFixture } from "@/mocks/fixtures";

const slug = "kopi-senja-umkm";

describe("chat session storage", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("stores and restores the raw session only from sessionStorage", () => {
    storeChatSession(slug, chatSessionFixture, window.sessionStorage);

    expect(
      readStoredChatSession(
        slug,
        window.sessionStorage,
        Date.parse("2026-06-14T08:00:00.000Z"),
      ),
    ).toEqual(chatSessionFixture);
    expect(window.localStorage.length).toBe(0);
  });

  it("removes expired and malformed sessions", () => {
    storeChatSession(slug, chatSessionFixture, window.sessionStorage);
    expect(
      readStoredChatSession(
        slug,
        window.sessionStorage,
        Date.parse("2026-06-16T08:00:00.000Z"),
      ),
    ).toBeNull();
    expect(window.sessionStorage.length).toBe(0);

    window.sessionStorage.setItem(`ai-sales-chat-session:${slug}`, "not-json");
    expect(readStoredChatSession(slug, window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("clears only the requested business session", () => {
    storeChatSession(slug, chatSessionFixture, window.sessionStorage);
    storeChatSession("toko-lain", chatSessionFixture, window.sessionStorage);

    clearStoredChatSession(slug, window.sessionStorage);

    expect(readStoredChatSession(slug, window.sessionStorage)).toBeNull();
    expect(
      readStoredChatSession(
        "toko-lain",
        window.sessionStorage,
        Date.parse("2026-06-14T08:00:00.000Z"),
      ),
    ).toEqual(chatSessionFixture);
  });
});
