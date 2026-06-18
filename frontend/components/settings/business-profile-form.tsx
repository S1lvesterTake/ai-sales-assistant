"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, ExternalLink, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import {
  createProfileFormSchema,
  toCreateInput,
  toUpdateInput,
  updateProfileFormSchema,
  type ProfileFormValues,
} from "@/lib/settings/validation";
import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import type { ApiErrorResponse } from "@/types/api";
import type { BusinessProfile } from "@/types/business";

function defaultValues(profile?: BusinessProfile): ProfileFormValues {
  return {
    businessName: profile?.businessName ?? "",
    slug: profile?.slug ?? "",
    description: profile?.description ?? "",
    category: profile?.category ?? "",
    whatsappNumber: profile?.whatsappNumber ?? "",
    location: profile?.location ?? "",
    operatingHours: profile?.operatingHours ?? "",
    mainOffer: profile?.mainOffer ?? "",
    ctaMessage: profile?.ctaMessage ?? "",
  };
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as Record<string, unknown>).success === false &&
    "message" in value &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

export function BusinessProfileForm({
  isDemo,
  profile,
}: {
  isDemo: boolean;
  profile?: BusinessProfile;
}) {
  const isExisting = Boolean(profile);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const schema = isExisting ? updateProfileFormSchema : createProfileFormSchema;
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    watch,
  } = useForm<ProfileFormValues>({
    defaultValues: defaultValues(profile),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
  });

  const slugValue = isExisting ? profile!.slug : (watch("slug") ?? "");
  const chatbotPath = `/chat/${slugValue}`;

  const phoneValue = watch("whatsappNumber") ?? "";
  const canonicalPhone = phoneValue ? normalizeIndonesianPhone(phoneValue) : null;

  const submit = handleSubmit(async (values) => {
    try {
      const body = isExisting ? toUpdateInput(values) : toCreateInput(values);
      const response = await fetch("/api/dashboard/settings", {
        method: isExisting ? "PATCH" : "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as unknown;
      if (response.status === 401) {
        window.location.assign(sessionExpiredHref("/dashboard/settings"));
        return;
      }
      if (!response.ok) {
        if (isErrorResponse(payload)) {
          const typedPayload = payload as ApiErrorResponse;
          typedPayload.errors?.forEach((fieldError) => {
            if (fieldError.field in values) {
              setError(fieldError.field as keyof ProfileFormValues, {
                type: "server",
                message: fieldError.message,
              });
            }
          });
          setError("root", { type: "server", message: typedPayload.message });
          return;
        }
        throw new Error("Invalid response");
      }

      toast.success(
        isExisting ? "Profil bisnis diperbarui." : "Profil bisnis berhasil dibuat.",
      );
      const savedProfile = (payload as { data: BusinessProfile }).data;
      reset(defaultValues(savedProfile));
      router.refresh();
    } catch {
      setError("root", {
        type: "network",
        message: "Profil bisnis belum dapat disimpan. Silakan coba lagi.",
      });
    }
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${chatbotPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available in this context
    }
  }

  return (
    <form className="grid gap-6" id="business-profile-form" noValidate onSubmit={submit}>
      {isDirty && !isSubmitting ? (
        <Alert>
          <AlertTitle>Ada perubahan yang belum disimpan</AlertTitle>
          <AlertDescription>Simpan profil agar perubahan diterapkan.</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="identity-section-heading" className="grid gap-4">
        <div>
          <h2 className="text-base font-semibold" id="identity-section-heading">
            Identitas bisnis
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nama dan slug bisnis yang terlihat oleh pelanggan.
          </p>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="setting-business-name"
            label="Nama bisnis"
            required
            {...(errors.businessName?.message
              ? { error: errors.businessName.message }
              : {})}
          >
            <Input
              id="setting-business-name"
              maxLength={150}
              disabled={isDemo}
              aria-invalid={Boolean(errors.businessName)}
              {...register("businessName")}
            />
          </FormField>

          {isExisting ? (
            <FormField
              description="Slug tidak dapat diubah setelah bisnis dibuat."
              htmlFor="setting-slug"
              label="Slug bisnis"
            >
              <Input
                id="setting-slug"
                disabled
                readOnly
                value={profile?.slug ?? ""}
              />
            </FormField>
          ) : (
            <FormField
              description="Hanya huruf kecil, angka, dan tanda hubung. Tidak dapat diubah setelah dibuat."
              htmlFor="setting-slug"
              label="Slug bisnis"
              required
              {...(errors.slug?.message ? { error: errors.slug.message } : {})}
            >
              <Input
                id="setting-slug"
                maxLength={100}
                placeholder="nama-bisnis-anda"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug")}
              />
            </FormField>
          )}
        </div>
      </section>

      <section aria-labelledby="details-section-heading" className="grid gap-4">
        <div>
          <h2 className="text-base font-semibold" id="details-section-heading">
            Detail bisnis
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informasi yang membantu chatbot menjawab pertanyaan pelanggan.
          </p>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            description={
              canonicalPhone
                ? `Format tersimpan: ${canonicalPhone}`
                : "Format diterima: 08..., 628..., atau +628..."
            }
            htmlFor="setting-whatsapp"
            label="Nomor WhatsApp"
            required
            {...(errors.whatsappNumber?.message
              ? { error: errors.whatsappNumber.message }
              : {})}
          >
            <Input
              id="setting-whatsapp"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              aria-invalid={Boolean(errors.whatsappNumber)}
              {...register("whatsappNumber")}
            />
          </FormField>
          <FormField
            htmlFor="setting-category"
            label="Kategori"
            {...(errors.category?.message ? { error: errors.category.message } : {})}
          >
            <Input
              id="setting-category"
              maxLength={100}
              placeholder="Kuliner, Fashion, Jasa..."
              {...register("category")}
            />
          </FormField>
        </div>
        <FormField
          htmlFor="setting-description"
          label="Deskripsi bisnis"
          {...(errors.description?.message ? { error: errors.description.message } : {})}
        >
          <Textarea
            id="setting-description"
            maxLength={500}
            placeholder="Ceritakan bisnis Anda secara singkat..."
            rows={3}
            {...register("description")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="setting-location"
            label="Lokasi"
            {...(errors.location?.message ? { error: errors.location.message } : {})}
          >
            <Input
              id="setting-location"
              maxLength={200}
              placeholder="Kota, Provinsi"
              {...register("location")}
            />
          </FormField>
          <FormField
            htmlFor="setting-hours"
            label="Jam operasional"
            {...(errors.operatingHours?.message
              ? { error: errors.operatingHours.message }
              : {})}
          >
            <Input
              id="setting-hours"
              maxLength={200}
              placeholder="Senin–Jumat, 09.00–17.00"
              {...register("operatingHours")}
            />
          </FormField>
        </div>
        <FormField
          htmlFor="setting-main-offer"
          label="Penawaran utama"
          {...(errors.mainOffer?.message ? { error: errors.mainOffer.message } : {})}
        >
          <Input
            id="setting-main-offer"
            maxLength={300}
            placeholder="Produk atau layanan unggulan Anda"
            {...register("mainOffer")}
          />
        </FormField>
        <FormField
          htmlFor="setting-cta"
          label="Pesan ajakan (CTA)"
          {...(errors.ctaMessage?.message ? { error: errors.ctaMessage.message } : {})}
        >
          <Input
            id="setting-cta"
            maxLength={200}
            placeholder="Hubungi kami melalui WhatsApp"
            {...register("ctaMessage")}
          />
        </FormField>
      </section>

      {isExisting ? (
        <section aria-labelledby="preview-section-heading" className="grid gap-4">
          <div>
            <h2 className="text-base font-semibold" id="preview-section-heading">
              Tautan chatbot publik
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bagikan tautan ini kepada pelanggan untuk memulai percakapan.
            </p>
          </div>
          <Separator />
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span
              aria-label="Tautan chatbot publik"
              className="min-w-0 flex-1 truncate font-mono text-sm"
            >
              {chatbotPath}
            </span>
            <Button
              aria-label="Salin tautan chatbot"
              size="sm"
              type="button"
              variant="outline"
              onClick={copyLink}
            >
              <Copy aria-hidden="true" />
              {copied ? "Disalin!" : "Salin"}
            </Button>
            <Button
              nativeButton={false}
              render={
                <a
                  href={chatbotPath}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label="Buka chatbot di tab baru"
                />
              }
              size="sm"
              variant="outline"
            >
              <ExternalLink aria-hidden="true" />
              Preview
            </Button>
          </div>
        </section>
      ) : null}

      {errors.root ? (
        <Alert variant="destructive">
          <AlertTitle>Profil belum tersimpan</AlertTitle>
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button
          disabled={isSubmitting}
          form="business-profile-form"
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {isSubmitting
            ? "Menyimpan..."
            : isExisting
              ? "Simpan perubahan"
              : "Buat profil bisnis"}
        </Button>
      </div>
    </form>
  );
}
