"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  currentLang: "id" | "en";
  className?: string;
}

export function LanguageSwitcher({ currentLang, className }: Props) {
  const router = useRouter();

  function switchTo(lang: "id" | "en") {
    document.cookie = `lang=${lang};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <div className={cn("flex items-center gap-1 rounded-full border bg-background p-0.5", className)}>
      <button
        type="button"
        onClick={() => switchTo("id")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          currentLang === "id"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Bahasa Indonesia"
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          currentLang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
