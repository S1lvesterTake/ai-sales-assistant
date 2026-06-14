import type { ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardAuthUnavailable } from "@/components/auth/dashboard-auth-unavailable";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AUTH_RETURN_TO_HEADER } from "@/lib/auth/constants";
import { getSafeDashboardReturnTo } from "@/lib/auth/redirects";
import { getDashboardSession } from "@/lib/auth/server-auth";

export default async function ProtectedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const returnTo = getSafeDashboardReturnTo(
    (await headers()).get(AUTH_RETURN_TO_HEADER),
  );
  const session = await getDashboardSession();

  if (session.status === "missing") {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (session.status === "invalid") {
    redirect(
      `/api/auth/session-expired?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }
  if (session.status === "unavailable") {
    return <DashboardAuthUnavailable />;
  }

  return (
    <DashboardShell
      businessName={session.businessProfile?.businessName ?? session.user.name}
      user={session.user}
    >
      {children}
    </DashboardShell>
  );
}
