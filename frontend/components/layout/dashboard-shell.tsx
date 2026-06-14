import type { ReactNode } from "react";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { DashboardMobileNavigation } from "@/components/layout/dashboard-mobile-navigation";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { buttonVariants } from "@/components/ui/button";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/35 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden border-r bg-sidebar lg:flex lg:flex-col">
        <div className="border-b p-5">
          <Brand />
        </div>
        <div className="flex-1 p-4">
          <DashboardNavigation />
        </div>
        <div className="border-t p-4">
          <Link
            href="/demo-chat"
            className={buttonVariants({ variant: "outline" })}
          >
            Buka chatbot
            <ExternalLink aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <DashboardMobileNavigation />
          <p className="text-sm font-medium text-muted-foreground">
            Kopi Senja UMKM
          </p>
          <div
            aria-label="Akun demo"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
          >
            KS
          </div>
        </header>
        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
