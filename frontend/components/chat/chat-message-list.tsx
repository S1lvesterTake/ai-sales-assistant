import { Bot, CircleAlert, RotateCcw, UserRound } from "lucide-react";

import type { ChatUiMessage } from "@/components/chat/chat-reducer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

export function ChatMessageList({
  messages,
  onRetry,
}: {
  messages: ChatUiMessage[];
  onRetry: (message: ChatUiMessage) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
          <Bot aria-hidden="true" className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Mulai percakapan</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Pilih pertanyaan yang disarankan atau ketik pertanyaan tentang produk
          dan layanan bisnis ini.
        </p>
      </div>
    );
  }

  return (
    <ol className="grid gap-5 px-4 py-6 sm:px-6" aria-label="Riwayat percakapan">
      {messages.map((message) => {
        const isCustomer = message.role === "customer";
        return (
          <li
            className={cn(
              "flex items-start gap-3",
              isCustomer && "flex-row-reverse",
            )}
            key={message.id}
          >
            <div
              className={cn(
                "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full",
                isCustomer
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {isCustomer ? (
                <UserRound aria-hidden="true" className="size-4" />
              ) : (
                <Bot aria-hidden="true" className="size-4" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[82%]",
                isCustomer && "flex flex-col items-end",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                  isCustomer
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border bg-card",
                  message.deliveryStatus === "failed" &&
                    "border border-destructive/40 bg-destructive/10 text-foreground",
                )}
              >
                {message.message}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={message.createdAt}>
                  {timeFormatter.format(new Date(message.createdAt))}
                </time>
                {message.deliveryStatus === "sending" ? (
                  <span>Memproses...</span>
                ) : null}
                {message.deliveryStatus === "failed" ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <CircleAlert aria-hidden="true" className="size-3" />
                    Gagal dikirim
                  </span>
                ) : null}
              </div>
              {message.deliveryStatus === "failed" ? (
                <div className="mt-2 flex flex-col items-end gap-1">
                  <p className="text-xs text-destructive">
                    {message.errorMessage ?? "Pesan belum berhasil dikirim."}
                  </p>
                  <Button
                    onClick={() => onRetry(message)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw aria-hidden="true" />
                    Kirim ulang
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
