"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Send,
  Store,
} from "lucide-react";

import {
  chatReducer,
  initialChatState,
  type ChatUiMessage,
} from "@/components/chat/chat-reducer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { LeadCaptureForm } from "@/components/chat/lead-capture-form";
import { TrackedWhatsappLink } from "@/components/marketing/tracked-whatsapp-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, getUserFacingErrorMessage } from "@/lib/api-errors";
import {
  clearStoredChatSession,
  readStoredChatSession,
  storeChatSession,
} from "@/lib/chat-session";
import { cn } from "@/lib/utils";
import { businessProfileService } from "@/services/business-profile.service";
import { chatService } from "@/services/chat.service";
import type { PaginationMeta } from "@/types/api";
import type { ChatSession } from "@/types/chat";
import type { PublicBusiness } from "@/types/business";

const PENDING_RETRY_LIMIT = 3;
const PENDING_RETRY_DELAY_MS = 500;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function ChatExperience({ businessSlug }: { businessSlug: string }) {
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [pageStatus, setPageStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [pageError, setPageError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyMeta, setHistoryMeta] = useState<PaginationMeta | null>(null);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const sendLockRef = useRef(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const createSession = useCallback(async () => {
    const response = await chatService.createSession(businessSlug);
    storeChatSession(businessSlug, response.data, window.sessionStorage);
    setSession(response.data);
    setSessionExpired(false);
    return response.data;
  }, [businessSlug]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const businessResponse = await businessProfileService.getPublic(businessSlug);
        if (cancelled) return;
        setBusiness(businessResponse.data);

        const storedSession = readStoredChatSession(
          businessSlug,
          window.sessionStorage,
        );
        if (!storedSession) {
          await createSession();
          if (!cancelled) setPageStatus("ready");
          return;
        }

        setSession(storedSession);
        try {
          const history = await chatService.getHistory(
            businessSlug,
            storedSession.sessionId,
            storedSession.sessionToken,
            { page: 1, limit: 20 },
          );
          if (cancelled) return;
          dispatch({ type: "historyLoaded", messages: history.data });
          setHistoryMeta(history.meta);
          setPageStatus("ready");
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            (error.kind === "unauthorized" || error.kind === "not_found")
          ) {
            clearStoredChatSession(businessSlug, window.sessionStorage);
            setSession(null);
            setSessionExpired(true);
            setPageStatus("ready");
            return;
          }
          throw error;
        }
      } catch (error) {
        if (cancelled) return;
        setPageError(getUserFacingErrorMessage(error));
        setPageStatus("error");
      }
    }

    const bootstrapTimer = window.setTimeout(() => void bootstrap(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(bootstrapTimer);
    };
  }, [businessSlug, createSession]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.messages.length, state.pendingLeadReply]);

  const processMessage = useCallback(
    async (clientMessageId: string, message: string) => {
      if (!session) return;
      setIsSending(true);
      dispatch({ type: "replyPending", clientMessageId });

      try {
        for (let attempt = 0; attempt <= PENDING_RETRY_LIMIT; attempt += 1) {
          const response = await chatService.sendMessage(
            businessSlug,
            session.sessionId,
            session.sessionToken,
            { clientMessageId, message },
          );

          if (response.data.processingStatus === "pending") {
            dispatch({ type: "replyPending", clientMessageId });
            if (attempt < PENDING_RETRY_LIMIT) {
              await wait(PENDING_RETRY_DELAY_MS);
              continue;
            }
            dispatch({
              type: "replyFailed",
              clientMessageId,
              errorMessage:
                "Jawaban masih diproses. Kirim ulang untuk memeriksa hasil dengan ID pesan yang sama.",
            });
            return;
          }

          dispatch({
            type: "replyCompleted",
            reply: response.data,
            createdAt: new Date().toISOString(),
          });
          return;
        }
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          (error.kind === "unauthorized" || error.kind === "not_found")
        ) {
          clearStoredChatSession(businessSlug, window.sessionStorage);
          setSession(null);
          setSessionExpired(true);
        }
        dispatch({
          type: "replyFailed",
          clientMessageId,
          errorMessage: getUserFacingErrorMessage(error),
        });
      } finally {
        setIsSending(false);
        sendLockRef.current = false;
      }
    },
    [businessSlug, session],
  );

  const sendNewMessage = useCallback(
    (message: string) => {
      const normalizedMessage = message.trim();
      if (
        !normalizedMessage ||
        normalizedMessage.length > 1000 ||
        !session ||
        sendLockRef.current
      ) {
        return;
      }

      sendLockRef.current = true;
      const clientMessageId = crypto.randomUUID();
      dispatch({
        type: "customerQueued",
        clientMessageId,
        message: normalizedMessage,
        createdAt: new Date().toISOString(),
      });
      setDraft("");
      void processMessage(clientMessageId, normalizedMessage);
    },
    [processMessage, session],
  );

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendNewMessage(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendNewMessage(draft);
    }
  }

  function retryMessage(message: ChatUiMessage) {
    if (!message.clientMessageId || sendLockRef.current || !session) return;
    sendLockRef.current = true;
    void processMessage(message.clientMessageId, message.message);
  }

  async function startFreshSession() {
    if (sendLockRef.current) return;
    setPageStatus("loading");
    clearStoredChatSession(businessSlug, window.sessionStorage);
    dispatch({ type: "reset" });
    setHistoryMeta(null);
    setHistoryError("");
    setLeadSuccess(false);
    try {
      await createSession();
      setPageStatus("ready");
    } catch (error) {
      setPageError(getUserFacingErrorMessage(error));
      setPageStatus("error");
    }
  }

  async function loadMoreHistory() {
    if (
      !session ||
      !historyMeta ||
      historyMeta.page >= historyMeta.totalPages ||
      isLoadingHistory
    ) {
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const history = await chatService.getHistory(
        businessSlug,
        session.sessionId,
        session.sessionToken,
        { page: historyMeta.page + 1, limit: historyMeta.limit },
      );
      dispatch({ type: "historyLoaded", messages: history.data, append: true });
      setHistoryMeta(history.meta);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.kind === "unauthorized" || error.kind === "not_found")
      ) {
        clearStoredChatSession(businessSlug, window.sessionStorage);
        setSession(null);
        setSessionExpired(true);
      }
      setHistoryError(getUserFacingErrorMessage(error));
    } finally {
      setIsLoadingHistory(false);
    }
  }

  if (pageStatus === "loading") {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-muted/40 px-6"
      >
        <div className="text-center" role="status">
          <LoaderCircle
            aria-hidden="true"
            className="mx-auto size-8 animate-spin text-primary"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Menyiapkan asisten bisnis...
          </p>
        </div>
      </main>
    );
  }

  if (pageStatus === "error" || !business) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-muted/40 px-6"
      >
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Chatbot belum dapat dibuka</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden="true" />
            Coba lagi
          </Button>
        </Alert>
      </main>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-muted/35">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-0 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-4 sm:rounded-t-3xl sm:border sm:px-6">
          <Link
            aria-label="Kembali ke landing page"
            href="/"
            className={cn(buttonVariants({ size: "icon", variant: "ghost" }))}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Store aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-semibold">{business.businessName}</h1>
              <Badge variant="secondary">Asisten AI</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {business.operatingHours ?? "Siap membantu pertanyaan pelanggan"}
            </p>
          </div>
          <Button
            onClick={() => void startFreshSession()}
            size="sm"
            type="button"
            variant="outline"
          >
            Chat baru
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-background sm:border-x">
          {sessionExpired ? (
            <Alert className="m-4 w-auto sm:m-6">
              <AlertTitle>Sesi chat telah berakhir</AlertTitle>
              <AlertDescription>
                Demi keamanan, mulai sesi baru untuk melanjutkan percakapan.
              </AlertDescription>
              <Button className="mt-4" onClick={() => void startFreshSession()}>
                Mulai sesi baru
              </Button>
            </Alert>
          ) : null}

          {historyMeta && historyMeta.page < historyMeta.totalPages ? (
            <div className="flex justify-center border-b p-3">
              <Button
                disabled={isLoadingHistory}
                onClick={() => void loadMoreHistory()}
                size="sm"
                variant="ghost"
              >
                {isLoadingHistory ? "Memuat..." : "Muat pesan lainnya"}
              </Button>
            </div>
          ) : null}

          {historyError ? (
            <Alert variant="destructive" className="m-4 w-auto sm:m-6">
              <AlertTitle>Riwayat belum dapat dimuat</AlertTitle>
              <AlertDescription>{historyError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-h-[28rem] flex-1 overflow-y-auto">
            <ChatMessageList messages={state.messages} onRetry={retryMessage} />
            <div ref={messageEndRef} />
          </div>

          {leadSuccess ? (
            <Alert className="mx-4 mb-4 w-auto sm:mx-6">
              <AlertTitle>Kontak berhasil disimpan</AlertTitle>
              <AlertDescription>
                Pemilik {business.businessName} dapat menindaklanjuti kebutuhan Anda.
              </AlertDescription>
            </Alert>
          ) : null}

          {state.pendingLeadReply && session ? (
            <LeadCaptureForm
              businessName={business.businessName}
              chatSessionId={session.sessionId}
              {...(state.pendingLeadReply.detectedProduct
                ? {
                    interestSummary: `Tertarik dengan ${state.pendingLeadReply.detectedProduct}`,
                  }
                : {})}
              onCaptured={() => {
                dispatch({ type: "leadCaptured" });
                setLeadSuccess(true);
              }}
              sessionToken={session.sessionToken}
            />
          ) : null}

          {state.whatsappReply?.whatsappUrl && session ? (
            <div className="border-t bg-[#25D366]/10 p-4 sm:px-6">
              <TrackedWhatsappLink
                businessSlug={businessSlug}
                context={{ sessionId: session.sessionId }}
                href={state.whatsappReply.whatsappUrl}
                sessionToken={session.sessionToken}
                className="w-full bg-[#168B47] text-white hover:bg-[#11743B] sm:w-auto"
              >
                <MessageCircle aria-hidden="true" />
                Lanjut ke WhatsApp
              </TrackedWhatsappLink>
            </div>
          ) : null}

          <div className="border-t bg-card p-4 sm:p-6">
            {state.messages.length === 0 ? (
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Pertanyaan yang disarankan">
                {business.suggestedQuestions.map((question) => (
                  <Button
                    disabled={!session || isSending || sessionExpired}
                    key={question}
                    onClick={() => sendNewMessage(question)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            ) : null}
            <form className="flex items-end gap-2" onSubmit={submitMessage}>
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="chat-message">
                  Tulis pesan
                </label>
                <Textarea
                  id="chat-message"
                  maxLength={1000}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Tanyakan produk, harga, atau cara pemesanan..."
                  rows={2}
                  value={draft}
                  disabled={!session || isSending || sessionExpired}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {draft.length}/1000
                </p>
              </div>
              <Button
                aria-label="Kirim pesan"
                disabled={
                  !session ||
                  isSending ||
                  sessionExpired ||
                  draft.trim().length === 0
                }
                size="icon"
                type="submit"
              >
                {isSending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Send aria-hidden="true" />
                )}
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
              {isSending
                ? "Asisten sedang menyiapkan jawaban."
                : "Tekan Enter untuk mengirim, Shift+Enter untuk baris baru."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
