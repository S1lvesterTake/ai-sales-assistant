"use client";

import { Eye, MessageCircle } from "lucide-react";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  formatLeadDate,
  formatLeadPhone,
  leadWhatsappHref,
} from "@/lib/leads/display";
import { useHydrated } from "@/lib/use-hydrated";
import type { Lead } from "@/types/lead";

type LeadDetail = Pick<Lead, "createdAt" | "phone" | "status"> & {
  name?: string;
  source?: string;
  interestSummary?: string;
};

export function LeadDetailDialog({
  hasLinkedConversation,
  lead,
}: {
  hasLinkedConversation: boolean;
  lead: LeadDetail;
}) {
  const isHydrated = useHydrated();
  const whatsappHref = leadWhatsappHref(lead.phone, lead.name);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button disabled={!isHydrated} size="sm" variant="outline" />
        }
      >
        <Eye aria-hidden="true" />
        Detail
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead.name || "Lead tanpa nama"}</DialogTitle>
          <DialogDescription>
            Informasi privat ini hanya tersedia di dashboard pemilik bisnis.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nomor WhatsApp</dt>
            <dd className="mt-1 font-medium">{formatLeadPhone(lead.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1"><LeadStatusBadge status={lead.status} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sumber</dt>
            <dd className="mt-1 font-medium">
              {lead.source === "chatbot" ? "Chatbot" : "Manual dashboard"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dibuat</dt>
            <dd className="mt-1 font-medium">{formatLeadDate(lead.createdAt)}</dd>
          </div>
        </dl>

        <Card>
          <CardContent className="grid gap-2 pt-1">
            <div className="flex items-center gap-2 font-medium">
              <MessageCircle aria-hidden="true" className="size-4" />
              Konteks percakapan
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {hasLinkedConversation
                ? "Lead ini terhubung ke percakapan chatbot yang telah diotorisasi untuk bisnis ini."
                : "Lead manual ini tidak memiliki percakapan chatbot yang terhubung."}
            </p>
            <p className="text-sm leading-6">
              {lead.interestSummary || "Belum ada ringkasan minat pelanggan."}
            </p>
          </CardContent>
        </Card>

        <DialogFooter>
          {whatsappHref ? (
            <a
              className={buttonVariants()}
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" />
              Follow up via WhatsApp
            </a>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
