"use client";

import type { ReactElement } from "react";

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
  onConfirm: () => void;
  title: string;
  trigger: ReactElement;
  variant?: "default" | "destructive";
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {cancelLabel}
          </DialogClose>
          <DialogClose
            render={<Button variant={variant} onClick={onConfirm} />}
          >
            {confirmLabel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
