"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  description = "Terjadi gangguan saat memuat data. Silakan coba lagi.",
  onRetry,
  title = "Data belum dapat dimuat",
}: {
  description?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle aria-hidden="true" className="size-8 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry} variant="outline">
          <RotateCcw aria-hidden="true" />
          Coba lagi
        </Button>
      ) : null}
    </section>
  );
}
