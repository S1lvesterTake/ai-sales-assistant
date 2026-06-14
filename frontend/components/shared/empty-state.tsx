import type { ReactNode } from "react";

import { Inbox } from "lucide-react";

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        {icon ?? <Inbox aria-hidden="true" className="size-6" />}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
