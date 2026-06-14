"use client";

import type { ReactNode } from "react";

import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappService } from "@/services/whatsapp.service";
import type { TrackWhatsappClickInput } from "@/types/whatsapp";

export function TrackedWhatsappLink({
  businessSlug,
  children,
  className,
  context,
  href,
  sessionToken,
}: {
  businessSlug: string;
  children: ReactNode;
  className?: string;
  context?: TrackWhatsappClickInput;
  href: string;
  sessionToken?: string;
}) {
  return (
    <a
      className={cn(buttonVariants({ size: "lg" }), className)}
      href={href}
      onClick={() => {
        const trackingRequest =
          context || sessionToken
            ? whatsappService.trackClick(
                businessSlug,
                context ?? {},
                sessionToken,
              )
            : whatsappService.trackClick(businessSlug);
        void trackingRequest.catch(() => undefined);
      }}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" />
      {children}
    </a>
  );
}
