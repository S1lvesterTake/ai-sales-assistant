"use client";

import { useRouter } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/layout/brand";
import { ErrorState } from "@/components/shared/error-state";

export function DashboardAuthUnavailable() {
  const router = useRouter();

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-muted/35 px-4 py-10"
    >
      <div className="w-full max-w-lg">
        <Brand className="mb-8 justify-center" />
        <ErrorState
          description="Sesi tidak dapat diverifikasi karena layanan backend sedang tidak tersedia. Data dashboard tidak ditampilkan."
          onRetry={() => router.refresh()}
          title="Dashboard belum dapat dibuka"
        />
        <div className="mx-auto mt-4 max-w-40">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
