import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/layout/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSafeDashboardReturnTo } from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "Masuk Dashboard | AI Sales untuk UMKM",
  description: "Masuk ke dashboard pengelolaan AI Sales Assistant.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnToValue = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;
  const reasonValue = Array.isArray(params.reason)
    ? params.reason[0]
    : params.reason;
  const reason =
    reasonValue === "expired" || reasonValue === "logged-out"
      ? reasonValue
      : undefined;

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/35 px-4 py-10 sm:px-6"
    >
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,oklch(0.86_0.08_175/0.45),transparent_68%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <Link
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Beranda
          </Link>
        </div>
        <Card className="shadow-xl shadow-foreground/5">
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle className="text-2xl">Masuk ke dashboard</CardTitle>
            <CardDescription className="leading-6">
              Kelola informasi bisnis, produk, FAQ, dan lead dari satu tempat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              {...(reason ? { reason } : {})}
              returnTo={getSafeDashboardReturnTo(returnToValue)}
            />
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Kredensial hanya dikirim ke server aplikasi dan JWT disimpan dalam
          cookie HttpOnly.
        </p>
      </div>
    </main>
  );
}
