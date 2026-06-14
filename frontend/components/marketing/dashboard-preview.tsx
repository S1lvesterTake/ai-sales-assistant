import {
  MessageSquareText,
  MousePointerClick,
  UsersRound,
} from "lucide-react";

const metrics = [
  { label: "Total lead", value: "24", icon: UsersRound },
  { label: "Percakapan", value: "86", icon: MessageSquareText },
  { label: "Klik WhatsApp", value: "31", icon: MousePointerClick },
] as const;

export function DashboardPreview() {
  return (
    <div className="rounded-[1.75rem] border bg-card p-5 shadow-2xl shadow-primary/10 sm:p-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <p className="text-sm text-muted-foreground">Dashboard bisnis</p>
          <p className="mt-1 text-xl font-semibold">Kopi Senja UMKM</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          Demo
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div className="rounded-2xl border bg-background p-4" key={metric.label}>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <p className="mt-4 text-2xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl bg-muted/60 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Lead terbaru</p>
          <span className="text-xs text-muted-foreground">Hari ini</span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-card p-3">
          <div>
            <p className="text-sm font-medium">Andi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paket kopi untuk rapat kantor
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Baru
          </span>
        </div>
      </div>
    </div>
  );
}
