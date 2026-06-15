"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FaqFormDialog } from "@/components/faqs/faq-form-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import type { Faq } from "@/types/faq";

function recoverExpiredSession(response: Response): boolean {
  if (response.status !== 401) return false;
  window.location.assign(
    sessionExpiredHref(`${window.location.pathname}${window.location.search}`),
  );
  return true;
}

export function FaqActiveToggle({ faq }: { faq: Faq }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function updateActive(checked: boolean) {
    if (isPending) return;
    setIsPending(true);
    try {
      const response = await fetch(
        `/api/dashboard/faqs/${encodeURIComponent(faq.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: checked }),
          headers: { "Content-Type": "application/json" },
        },
      );
      if (recoverExpiredSession(response)) return;
      if (!response.ok) throw new Error("Update failed");
      toast.success(checked ? "FAQ diaktifkan." : "FAQ dinonaktifkan.");
      router.refresh();
    } catch {
      toast.error("Status FAQ belum dapat diperbarui.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Switch
        aria-label={`Ubah status ${faq.question}`}
        checked={faq.isActive}
        disabled={isPending}
        onCheckedChange={(checked) => void updateActive(checked)}
        size="sm"
      />
      <span className="text-xs text-muted-foreground">
        {faq.isActive ? "Aktif" : "Nonaktif"}
      </span>
    </div>
  );
}

export function FaqActions({ faq }: { faq: Faq }) {
  const router = useRouter();

  async function remove() {
    const response = await fetch(
      `/api/dashboard/faqs/${encodeURIComponent(faq.id)}`,
      { method: "DELETE" },
    );
    if (recoverExpiredSession(response)) return;
    if (!response.ok) throw new Error("Delete failed");
    toast.success("FAQ dihapus.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FaqFormDialog faq={faq} />
      <ConfirmationDialog
        confirmLabel="Hapus FAQ"
        description={`Pertanyaan “${faq.question}” akan dihapus dari pengetahuan chatbot.`}
        onConfirm={remove}
        title="Hapus FAQ?"
        trigger={
          <Button size="sm" variant="destructive">
            <Trash2 aria-hidden="true" />
            Hapus
          </Button>
        }
        variant="destructive"
      />
    </div>
  );
}
