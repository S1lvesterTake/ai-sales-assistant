"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle, LogIn, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { DEMO_CREDENTIALS } from "@/lib/auth/constants";
import {
  loginSchema,
  type LoginFormValues,
} from "@/lib/auth/validation";
import type { ApiErrorResponse, ApiFieldError } from "@/types/api";
import type { AuthUser } from "@/types/auth";

interface LoginSuccessResponse {
  success: true;
  message: string;
  data: {
    user: AuthUser;
    expiresAt: string;
    redirectTo: string;
  };
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false &&
    "message" in value &&
    typeof value.message === "string"
  );
}

function isSuccessResponse(value: unknown): value is LoginSuccessResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === true &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "redirectTo" in value.data &&
    typeof value.data.redirectTo === "string"
  );
}

export function LoginForm({
  reason,
  returnTo,
}: {
  reason?: "expired" | "logged-out";
  returnTo: string;
}) {
  const router = useRouter();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  function applyFieldErrors(fieldErrors: ApiFieldError[] = []) {
    fieldErrors.forEach((fieldError) => {
      if (fieldError.field === "email" || fieldError.field === "password") {
        setError(fieldError.field, {
          type: "server",
          message: fieldError.message,
        });
      }
    });
  }

  const submit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...values, returnTo }),
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok || !isSuccessResponse(payload)) {
        if (isErrorResponse(payload)) {
          applyFieldErrors(payload.errors);
          setError("root", { type: "server", message: payload.message });
          return;
        }
        setError("root", {
          type: "server",
          message: "Respons login tidak dapat diproses. Silakan coba lagi.",
        });
        return;
      }

      router.replace(payload.data.redirectTo);
      router.refresh();
    } catch {
      setError("root", {
        type: "network",
        message: "Koneksi ke layanan login gagal. Silakan coba lagi.",
      });
    }
  });

  return (
    <div className="grid gap-6">
      {reason === "expired" ? (
        <Alert>
          <AlertTitle>Sesi Anda telah berakhir</AlertTitle>
          <AlertDescription>
            Masuk kembali untuk melanjutkan ke dashboard dengan aman.
          </AlertDescription>
        </Alert>
      ) : null}
      {reason === "logged-out" ? (
        <Alert>
          <AlertTitle>Anda telah keluar</AlertTitle>
          <AlertDescription>
            Sesi dashboard sudah dihapus dari browser ini.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border bg-secondary/35 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <WandSparkles aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Akun demo siap digunakan</p>
            <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
              {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
            </p>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => reset(DEMO_CREDENTIALS)}
          type="button"
          variant="outline"
        >
          <KeyRound aria-hidden="true" />
          Gunakan akun demo
        </Button>
      </div>

      <form className="grid gap-4" noValidate onSubmit={submit}>
        <FormField
          {...(errors.email?.message ? { error: errors.email.message } : {})}
          htmlFor="login-email"
          label="Email"
          required
        >
          <Input
            id="login-email"
            autoComplete="email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>
        <FormField
          {...(errors.password?.message
            ? { error: errors.password.message }
            : {})}
          htmlFor="login-password"
          label="Kata sandi"
          required
        >
          <Input
            id="login-password"
            autoComplete="current-password"
            type="password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </FormField>
        {errors.root ? (
          <Alert variant="destructive">
            <AlertTitle>Belum dapat masuk</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button className="mt-1 w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <LogIn aria-hidden="true" />
          )}
          {isSubmitting ? "Memeriksa akun..." : "Masuk ke dashboard"}
        </Button>
      </form>
    </div>
  );
}
