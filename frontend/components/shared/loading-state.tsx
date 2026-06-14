import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Memuat data" className="grid gap-3">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="mt-3 grid gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton className="h-20 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
