import { redirect } from "next/navigation";

import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiClientError } from "@/lib/api-errors";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import { getDashboardSession } from "@/lib/auth/server-auth";
import { getBusinessProfile } from "@/lib/settings/server-settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const onboarding = params.onboarding === "1";

  const [sessionResult, profileResult] = await Promise.allSettled([
    getDashboardSession(),
    getBusinessProfile(),
  ]);

  if (
    sessionResult.status === "rejected" ||
    sessionResult.value.status !== "authenticated"
  ) {
    redirect("/login");
  }

  if (profileResult.status === "rejected") {
    const error = profileResult.reason;
    if (error instanceof ApiClientError && error.kind === "unauthorized") {
      redirect(sessionExpiredHref("/dashboard/settings"));
    }
  }

  const { user } = sessionResult.value;
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Lengkapi dan kelola identitas bisnis yang digunakan chatbot."
        eyebrow="Pengaturan"
        title="Profil bisnis"
      />

      {onboarding ? (
        <Alert>
          <AlertTitle>Profil bisnis perlu dilengkapi</AlertTitle>
          <AlertDescription>
            Buat profil bisnis sebelum membuka fitur dashboard lainnya.
          </AlertDescription>
        </Alert>
      ) : null}

      {profileResult.status === "rejected" ? (
        <Alert variant="destructive">
          <AlertTitle>Profil tidak dapat dimuat</AlertTitle>
          <AlertDescription>
            Terjadi kesalahan saat memuat profil bisnis. Silakan muat ulang
            halaman.
          </AlertDescription>
        </Alert>
      ) : null}

      <BusinessProfileForm isDemo={user.isDemo} {...(profile ? { profile } : {})} />
    </div>
  );
}
