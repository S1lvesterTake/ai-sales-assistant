"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import type { Product } from "@/types/product";

function recoverExpiredSession(response: Response): boolean {
  if (response.status !== 401) return false;
  window.location.assign(
    sessionExpiredHref(`${window.location.pathname}${window.location.search}`),
  );
  return true;
}

export function ProductAvailabilityToggle({ product }: { product: Product }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function updateAvailability(checked: boolean) {
    if (isPending) return;
    setIsPending(true);
    try {
      const response = await fetch(
        `/api/dashboard/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isAvailable: checked }),
          headers: { "Content-Type": "application/json" },
        },
      );
      if (recoverExpiredSession(response)) return;
      if (!response.ok) throw new Error("Update failed");
      toast.success(checked ? "Produk ditandai tersedia." : "Produk dinonaktifkan.");
      router.refresh();
    } catch {
      toast.error("Status produk belum dapat diperbarui.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Switch
        aria-label={`Ubah ketersediaan ${product.name}`}
        checked={product.isAvailable}
        disabled={isPending}
        onCheckedChange={(checked) => void updateAvailability(checked)}
        size="sm"
      />
      <span className="text-xs text-muted-foreground">
        {product.isAvailable ? "Tersedia" : "Nonaktif"}
      </span>
    </div>
  );
}

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();

  async function remove() {
    const response = await fetch(
      `/api/dashboard/products/${encodeURIComponent(product.id)}`,
      { method: "DELETE" },
    );
    if (recoverExpiredSession(response)) return;
    if (!response.ok) {
      throw new Error("Delete failed");
    }
    toast.success("Produk dihapus.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProductFormDialog product={product} />
      <ConfirmationDialog
        confirmLabel="Hapus produk"
        description={`Produk ${product.name} akan dihapus dari pengetahuan chatbot.`}
        onConfirm={remove}
        title="Hapus produk?"
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
