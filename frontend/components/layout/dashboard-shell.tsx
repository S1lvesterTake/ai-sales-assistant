import type { ReactNode } from "react";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/layout/brand";
import { DashboardMobileNavigation } from "@/components/layout/dashboard-mobile-navigation";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { buttonVariants } from "@/components/ui/button";
import type { AuthUser } from "@/types/auth";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("id-ID") ?? "")
    .join("");
}

export function DashboardShell({
  businessName,
  children,
  user,
}: {
  businessName: string;
  children: ReactNode;
  user: AuthUser;
}) {
  return (
    <div className="min-h-screen bg-muted/35 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden border-r bg-sidebar lg:flex lg:flex-col">
        <div className="border-b p-5">
          <Brand />
        </div>
        <div className="flex-1 p-4">
          <DashboardNavigation />
        </div>
        <div className="grid gap-2 border-t p-4">
          <Link
            href="/demo-chat"
            className={buttonVariants({ variant: "outline" })}
          >
            Buka chatbot
            <ExternalLink aria-hidden="true" />
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <DashboardMobileNavigation />
          <p className="min-w-0 flex-1 truncate px-2 text-center text-sm font-medium text-muted-foreground lg:text-left">
            {businessName}
          </p>
          <div
            aria-label={`Akun ${user.name}`}
            title={user.email}
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
          >
            {getInitials(user.name)}
          </div>
          <div className="lg:hidden">
            <LogoutButton compact />
          </div>
        </header>
        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
