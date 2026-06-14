import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const onboarding = params.onboarding === "1";

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
      <Card>
        <CardHeader>
          <CardTitle>Form profil disiapkan pada FE-10</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Route ini tetap dapat diakses oleh pengguna baru tanpa profil agar
          proses onboarding tidak membentuk redirect loop.
        </CardContent>
      </Card>
    </div>
  );
}
