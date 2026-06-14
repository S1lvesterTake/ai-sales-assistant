import {
  chatReducer,
  initialChatState,
} from "@/components/chat/chat-reducer";
import { chatMessageFixtures, chatReplyFixture } from "@/mocks/fixtures";

const clientMessageId = "019b9d80-7a2e-7b4b-8dc1-7a44b6300777";
const createdAt = "2026-06-14T08:00:00.000Z";

describe("chatReducer", () => {
  it("keeps customer and assistant history records with related identifiers", () => {
    const state = chatReducer(initialChatState, {
      type: "historyLoaded",
      messages: chatMessageFixtures,
    });

    expect(state.messages).toHaveLength(2);
    expect(state.messages.map((message) => message.role)).toEqual([
      "customer",
      "assistant",
    ]);
  });

  it("prevents duplicate customer and assistant messages on completed retries", () => {
    const queued = chatReducer(initialChatState, {
      type: "customerQueued",
      clientMessageId,
      message: "Saya ingin pesan kopi.",
      createdAt,
    });
    const duplicateQueue = chatReducer(queued, {
      type: "customerQueued",
      clientMessageId,
      message: "Saya ingin pesan kopi.",
      createdAt,
    });
    const completed = chatReducer(duplicateQueue, {
      type: "replyCompleted",
      reply: {
        ...chatReplyFixture,
        clientMessageId,
        shouldCaptureLead: true,
      },
      createdAt,
    });
    const retried = chatReducer(completed, {
      type: "replyCompleted",
      reply: { ...chatReplyFixture, clientMessageId },
      createdAt,
    });

    expect(retried.messages).toHaveLength(2);
    expect(retried.messages[0]).toMatchObject({
      clientMessageId,
      deliveryStatus: "sent",
      processingStatus: "completed",
    });
    expect(retried.messages[1]).toMatchObject({
      replyToMessageId: clientMessageId,
      role: "assistant",
    });
    expect(retried.pendingLeadReply?.clientMessageId).toBe(clientMessageId);
  });

  it("marks a failed message retryable and clears the failure after success", () => {
    const queued = chatReducer(initialChatState, {
      type: "customerQueued",
      clientMessageId,
      message: "Tes jaringan",
      createdAt,
    });
    const failed = chatReducer(queued, {
      type: "replyFailed",
      clientMessageId,
      errorMessage: "Koneksi gagal",
    });
    const recovered = chatReducer(failed, {
      type: "replyCompleted",
      reply: { ...chatReplyFixture, clientMessageId },
      createdAt,
    });

    expect(failed.messages[0]).toMatchObject({
      deliveryStatus: "failed",
      errorMessage: "Koneksi gagal",
    });
    expect(recovered.messages[0]).not.toHaveProperty("errorMessage");
    expect(recovered.messages[0]?.deliveryStatus).toBe("sent");
  });
});
