import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </label>
      {children}
      {description && !error ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-xs leading-5 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
