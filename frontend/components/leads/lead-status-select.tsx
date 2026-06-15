"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import { leadStatusOptions } from "@/lib/leads/display";
import type { Lead } from "@/types/lead";

type StatusLead = Pick<Lead, "id" | "phone" | "status"> & { name?: string };

export function LeadStatusSelect({ lead }: { lead: StatusLead }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function updateStatus(status: Lead["status"]) {
    if (isPending || status === lead.status) return;
    setIsPending(true);
    try {
      const response = await fetch(
        `/api/dashboard/leads/${encodeURIComponent(lead.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
          headers: { "Content-Type": "application/json" },
        },
      );
      if (response.status === 401) {
        window.location.assign(
          sessionExpiredHref(`${window.location.pathname}${window.location.search}`),
        );
        return;
      }
      if (!response.ok) throw new Error("Update failed");
      toast.success("Status lead diperbarui.");
      router.refresh();
    } catch {
      toast.error("Status lead belum dapat diperbarui.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <select
      aria-label={`Ubah status lead ${lead.name || lead.phone}`}
      className="h-8 min-w-32 rounded-lg border border-input bg-background px-2.5 text-sm"
      disabled={isPending}
      onChange={(event) => void updateStatus(event.target.value as Lead["status"])}
      value={lead.status}
    >
      {leadStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
