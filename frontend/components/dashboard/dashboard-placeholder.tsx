import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export function DashboardPlaceholder({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="grid gap-6">
      <PageHeader
        description={description}
        eyebrow="Dashboard"
        title={title}
      />
      <Card>
        <CardHeader>
          <CardTitle>Route terlindungi sudah aktif</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Modul lengkap akan dibangun pada bagian frontend berikutnya. Saat ini
          route telah melalui validasi JWT server-side dan pemeriksaan profil
          bisnis.
        </CardContent>
      </Card>
    </div>
  );
}
