"use client";

import type { ReactNode } from "react";

import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappService } from "@/services/whatsapp.service";

export function TrackedWhatsappLink({
  businessSlug,
  children,
  className,
  href,
}: {
  businessSlug: string;
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <a
      className={cn(buttonVariants({ size: "lg" }), className)}
      href={href}
      onClick={() => {
        void whatsappService.trackClick(businessSlug).catch(() => undefined);
      }}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" />
      {children}
    </a>
  );
}
