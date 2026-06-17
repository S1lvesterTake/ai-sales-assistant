import { PageHeader } from "@/components/shared/page-header";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="grid gap-6">
      <PageHeader
        description="Lengkapi dan kelola identitas bisnis yang digunakan chatbot."
        eyebrow="Pengaturan"
        title="Profil bisnis"
      />
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-36" />
      </div>
    </div>
  );
}
