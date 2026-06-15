import Link from "next/link";

import { MessageSquareText } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <MessageSquareText aria-hidden="true" className="size-5" />
      </span>
      <span className="leading-tight">
        AI Sales
        <span className="block text-xs font-medium text-muted-foreground">
          untuk UMKM
        </span>
      </span>
    </Link>
  );
}
