"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, UserRoundPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, getUserFacingErrorMessage, mapFieldErrors } from "@/lib/api-errors";
import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import { leadsService } from "@/services/leads.service";

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  phone: z.string().refine(
    (value) => normalizeIndonesianPhone(value) !== null,
    "Gunakan nomor Indonesia seperti 0812..., 62812..., atau +62812...",
  ),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export function LeadCaptureForm({
  businessName,
  chatSessionId,
  interestSummary,
  onCaptured,
  sessionToken,
}: {
  businessName: string;
  chatSessionId: string;
  interestSummary?: string;
  onCaptured: () => void;
  sessionToken: string;
}) {
  const {
    formState: { errors, isSubmitting, isSubmitSuccessful },
    handleSubmit,
    register,
    setError,
  } = useForm<LeadFormValues>({
    defaultValues: { name: "", phone: "" },
    resolver: zodResolver(leadSchema),
  });

  const submitLead = handleSubmit(async (values) => {
    const phone = normalizeIndonesianPhone(values.phone);
    if (!phone) return;

    try {
      await leadsService.createFromChat(
        {
          chatSessionId,
          name: values.name.trim(),
          phone,
          source: "chatbot",
          ...(interestSummary ? { interestSummary } : {}),
        },
        sessionToken,
      );
      onCaptured();
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors.length > 0) {
        const fieldErrors = mapFieldErrors(error.fieldErrors);
        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (field === "name" || field === "phone") {
            setError(field, { message, type: "server" });
          }
        });
      }
      setError("root", { message: getUserFacingErrorMessage(error) });
    }
  });

  if (isSubmitSuccessful) return null;

  return (
    <section className="border-t bg-secondary/35 p-4 sm:p-6" aria-labelledby="lead-title">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
          <UserRoundPlus aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h2 id="lead-title" className="font-semibold">
            Minta {businessName} menghubungi Anda
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Simpan kontak agar pemilik bisnis dapat menindaklanjuti kebutuhan Anda.
          </p>
        </div>
      </div>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submitLead} noValidate>
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Nama</Label>
          <Input
            id="lead-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-phone">Nomor WhatsApp</Label>
          <Input
            id="lead-phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder="0812 3456 7890"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>
        {errors.root ? (
          <Alert variant="destructive" className="sm:col-span-2">
            <AlertTitle>Kontak belum tersimpan</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="sm:col-span-2">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            Simpan kontak
          </Button>
        </div>
      </form>
    </section>
  );
}
