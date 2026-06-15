import { Skeleton } from "@/components/ui/skeleton";

export default function FaqsLoading() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat daftar FAQ">
      <Skeleton className="h-24" />
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
