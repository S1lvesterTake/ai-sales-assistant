import type { ChatMessage, ChatReply } from "@/types/chat";

export interface ChatUiMessage extends ChatMessage {
  deliveryStatus?: "sending" | "sent" | "failed";
  errorMessage?: string;
}

export interface ChatState {
  messages: ChatUiMessage[];
  pendingLeadReply: ChatReply | null;
  whatsappReply: ChatReply | null;
}

export type ChatAction =
  | { type: "historyLoaded"; messages: ChatMessage[]; append?: boolean }
  | {
      type: "customerQueued";
      clientMessageId: string;
      message: string;
      createdAt: string;
    }
  | { type: "replyPending"; clientMessageId: string }
  | { type: "replyCompleted"; reply: ChatReply; createdAt: string }
  | { type: "replyFailed"; clientMessageId: string; errorMessage: string }
  | { type: "leadCaptured" }
  | { type: "reset" };

export const initialChatState: ChatState = {
  messages: [],
  pendingLeadReply: null,
  whatsappReply: null,
};

function deduplicateMessages(messages: ChatUiMessage[]): ChatUiMessage[] {
  const identifiers = new Set<string>();
  return messages.filter((message) => {
    const identifier = `${message.role}:${
      message.clientMessageId ?? message.replyToMessageId ?? message.id
    }`;
    if (identifiers.has(identifier)) return false;
    identifiers.add(identifier);
    return true;
  });
}

export function chatReducer(
  state: ChatState,
  action: ChatAction,
): ChatState {
  switch (action.type) {
    case "historyLoaded":
      return {
        ...state,
        messages: deduplicateMessages(
          action.append
            ? [...state.messages, ...action.messages]
            : action.messages,
        ),
      };
    case "customerQueued": {
      if (
        state.messages.some(
          (message) => message.clientMessageId === action.clientMessageId,
        )
      ) {
        return state;
      }
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `customer:${action.clientMessageId}`,
            clientMessageId: action.clientMessageId,
            processingStatus: "pending",
            role: "customer",
            message: action.message,
            createdAt: action.createdAt,
            deliveryStatus: "sending",
          },
        ],
      };
    }
    case "replyPending":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.clientMessageId === action.clientMessageId
            ? {
                ...message,
                processingStatus: "pending",
                deliveryStatus: "sending",
              }
            : message,
        ),
      };
    case "replyCompleted": {
      const hasAssistantReply = state.messages.some(
        (message) => message.replyToMessageId === action.reply.clientMessageId,
      );
      const updatedMessages = state.messages.map((message) =>
        message.clientMessageId === action.reply.clientMessageId
          ? (() => {
              const updatedMessage: ChatUiMessage = {
                ...message,
                processingStatus: "completed" as const,
                deliveryStatus: "sent" as const,
              };
              delete updatedMessage.errorMessage;
              return updatedMessage;
            })()
          : message,
      );
      return {
        messages:
          hasAssistantReply || !action.reply.message
            ? updatedMessages
            : [
                ...updatedMessages,
                {
                  id: `assistant:${action.reply.clientMessageId}`,
                  replyToMessageId: action.reply.clientMessageId,
                  role: "assistant",
                  message: action.reply.message,
                  createdAt: action.createdAt,
                },
              ],
        pendingLeadReply: action.reply.shouldCaptureLead
          ? action.reply
          : state.pendingLeadReply,
        whatsappReply: action.reply.shouldShowWhatsappCta
          ? action.reply
          : state.whatsappReply,
      };
    }
    case "replyFailed":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.clientMessageId === action.clientMessageId
            ? {
                ...message,
                processingStatus: "failed",
                deliveryStatus: "failed",
                errorMessage: action.errorMessage,
              }
            : message,
        ),
      };
    case "leadCaptured":
      return { ...state, pendingLeadReply: null };
    case "reset":
      return initialChatState;
  }
}
