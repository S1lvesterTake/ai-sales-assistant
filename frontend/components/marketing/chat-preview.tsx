import { Bot, MessageCircle, UserRound } from "lucide-react";

export function ChatPreview() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-3 border-b bg-primary px-5 py-4 text-primary-foreground">
        <div className="flex size-10 items-center justify-center rounded-full bg-white/15">
          <MessageCircle aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="font-semibold">Kopi Senja Assistant</p>
          <p className="text-xs text-primary-foreground/75">
            Siap membantu pelanggan
          </p>
        </div>
      </div>
      <div className="grid gap-4 bg-muted/40 p-5 sm:p-6">
        <div className="flex max-w-[88%] items-start gap-3">
          <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Bot aria-hidden="true" className="size-4" />
          </div>
          <p className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm leading-6 shadow-sm">
            Halo! Saya asisten Kopi Senja. Mau cari menu, harga, atau informasi
            pemesanan?
          </p>
        </div>
        <div className="ml-auto flex max-w-[88%] flex-row-reverse items-start gap-3">
          <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserRound aria-hidden="true" className="size-4" />
          </div>
          <p className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
            Berapa harga Kopi Susu Gula Aren?
          </p>
        </div>
        <div className="flex max-w-[88%] items-start gap-3">
          <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Bot aria-hidden="true" className="size-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm leading-6 shadow-sm">
            <p>Harganya Rp18.000 dan tersedia hari ini.</p>
            <span className="mt-3 inline-flex rounded-full bg-[#25D366]/15 px-3 py-1 text-xs font-semibold text-[#137333]">
              Lanjut ke WhatsApp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
