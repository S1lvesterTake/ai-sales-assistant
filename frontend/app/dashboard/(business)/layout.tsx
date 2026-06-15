import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getDashboardSession } from "@/lib/auth/server-auth";

export default async function BusinessRequiredLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getDashboardSession();
  if (session.status !== "authenticated") redirect("/login");
  if (!session.businessProfile) redirect("/dashboard/settings?onboarding=1");
  return children;
}
