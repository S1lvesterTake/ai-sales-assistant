"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import {
  manualLeadSchema,
  toManualLeadInput,
  type ManualLeadValues,
} from "@/lib/leads/validation";
import { useHydrated } from "@/lib/use-hydrated";
import type { ApiErrorResponse } from "@/types/api";

const defaultValues: ManualLeadValues = {
  name: "",
  phone: "",
  interestSummary: "",
};

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

export function LeadFormDialog() {
  const isHydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ManualLeadValues>({
    defaultValues,
    resolver: zodResolver(manualLeadSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/dashboard/leads", {
        method: "POST",
        body: JSON.stringify(toManualLeadInput(values)),
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as unknown;
      if (response.status === 401) {
        window.location.assign(
          sessionExpiredHref(`${window.location.pathname}${window.location.search}`),
        );
        return;
      }
      if (!response.ok) {
        if (isErrorResponse(payload)) {
          payload.errors?.forEach((fieldError) => {
            if (fieldError.field in values) {
              setError(fieldError.field as keyof ManualLeadValues, {
                type: "server",
                message: fieldError.message,
              });
            }
          });
          setError("root", { type: "server", message: payload.message });
          return;
        }
        throw new Error("Invalid response");
      }

      toast.success("Lead ditambahkan.");
      setOpen(false);
      reset(defaultValues);
      router.refresh();
    } catch {
      setError("root", {
        type: "network",
        message: "Lead belum dapat disimpan. Silakan coba lagi.",
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen);
          if (nextOpen) reset(defaultValues);
        }
      }}
    >
      <DialogTrigger render={<Button disabled={!isHydrated} />}>
        <UserPlus aria-hidden="true" />
        Tambah lead
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah lead</DialogTitle>
          <DialogDescription>
            Simpan calon pelanggan yang datang dari luar chatbot untuk ditindaklanjuti.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" id="lead-form-new" noValidate onSubmit={submit}>
          <FormField
            {...(errors.name?.message ? { error: errors.name.message } : {})}
            htmlFor="lead-form-name"
            label="Nama"
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              id="lead-form-name"
              maxLength={100}
              placeholder="Contoh: Andi"
              {...register("name")}
            />
          </FormField>
          <FormField
            {...(errors.phone?.message ? { error: errors.phone.message } : {})}
            description="Format yang diterima: 08..., 628..., atau +628...."
            htmlFor="lead-form-phone"
            label="Nomor WhatsApp"
            required
          >
            <Input
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              id="lead-form-phone"
              inputMode="tel"
              maxLength={24}
              placeholder="081234567890"
              {...register("phone")}
            />
          </FormField>
          <FormField
            {...(errors.interestSummary?.message
              ? { error: errors.interestSummary.message }
              : {})}
            htmlFor="lead-form-interest"
            label="Ringkasan minat"
          >
            <Textarea
              aria-invalid={Boolean(errors.interestSummary)}
              id="lead-form-interest"
              maxLength={1000}
              placeholder="Produk atau kebutuhan yang diminati"
              rows={4}
              {...register("interestSummary")}
            />
          </FormField>
          {errors.root ? (
            <Alert variant="destructive">
              <AlertTitle>Lead belum tersimpan</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <Button disabled={isSubmitting} form="lead-form-new" type="submit">
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            {isSubmitting ? "Menyimpan..." : "Simpan lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
