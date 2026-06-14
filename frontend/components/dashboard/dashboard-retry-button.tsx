"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function DashboardRetryButton({ label = "Coba lagi" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button onClick={() => router.refresh()} size="sm" type="button" variant="outline">
      <RotateCcw aria-hidden="true" />
      {label}
    </Button>
  );
}
