import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { getPublicEnv } from "@/lib/env";

export function SiteFooter() {
  const environment = getPublicEnv();
  const apiDocsUrl = new URL(
    "/api/docs",
    environment.NEXT_PUBLIC_API_BASE_URL,
  ).toString();

  return (
    <footer className="border-t bg-card/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-12">
        <Brand />
        <nav
          aria-label="Navigasi footer"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          <Link className="hover:text-foreground" href="/demo-chat">
            Demo chatbot
          </Link>
          <Link className="hover:text-foreground" href="/login">
            Dashboard
          </Link>
          <a
            className="hover:text-foreground"
            href={apiDocsUrl}
            rel="noreferrer"
            target="_blank"
          >
            API Docs
          </a>
          {environment.NEXT_PUBLIC_REPOSITORY_URL ? (
            <a
              className="hover:text-foreground"
              href={environment.NEXT_PUBLIC_REPOSITORY_URL}
              rel="noreferrer"
              target="_blank"
            >
              Repository
            </a>
          ) : null}
        </nav>
        <p className="text-sm text-muted-foreground">
          Portfolio full-stack AI untuk UMKM Indonesia.
        </p>
      </div>
    </footer>
  );
}
