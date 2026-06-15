"use client";

import { useState, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmationDialog({
  cancelLabel = "Batal",
  confirmLabel = "Lanjutkan",
  description,
  onConfirm,
  title,
  trigger,
  variant = "default",
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  title: string;
  trigger: ReactElement;
  variant?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (isConfirming) return;
    setIsConfirming(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setError("Tindakan belum berhasil. Silakan coba lagi.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isConfirming) {
          setOpen(nextOpen);
          if (!nextOpen) setError("");
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            disabled={isConfirming}
            render={<Button disabled={isConfirming} variant="outline" />}
          >
            {cancelLabel}
          </DialogClose>
          <Button
            disabled={isConfirming}
            onClick={() => void confirm()}
            variant={variant}
          >
            {isConfirming ? "Memproses..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
