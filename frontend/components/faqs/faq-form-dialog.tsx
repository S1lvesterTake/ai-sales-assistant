"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleHelp, LoaderCircle, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import { useHydrated } from "@/lib/use-hydrated";
import type { ApiErrorResponse } from "@/types/api";
import type { Faq, FaqInput } from "@/types/faq";

const formSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib diisi.")
    .max(300, "Pertanyaan maksimal 300 karakter."),
  answer: z
    .string()
    .trim()
    .min(1, "Jawaban wajib diisi.")
    .max(1000, "Jawaban maksimal 1000 karakter."),
  category: z.string().trim().max(100, "Kategori maksimal 100 karakter."),
  isActive: z.boolean(),
});

type FaqFormValues = z.infer<typeof formSchema>;

function defaultValues(faq?: Faq): FaqFormValues {
  return {
    question: faq?.question ?? "",
    answer: faq?.answer ?? "",
    category: faq?.category ?? "",
    isActive: faq?.isActive ?? true,
  };
}

function toInput(values: FaqFormValues): FaqInput {
  return {
    question: values.question.trim(),
    answer: values.answer.trim(),
    category: values.category.trim(),
    isActive: values.isActive,
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

export function FaqFormDialog({ faq }: { faq?: Faq }) {
  const isEditing = Boolean(faq);
  const isHydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<FaqFormValues>({
    defaultValues: defaultValues(faq),
    resolver: zodResolver(formSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      const response = await fetch(
        faq
          ? `/api/dashboard/faqs/${encodeURIComponent(faq.id)}`
          : "/api/dashboard/faqs",
        {
          method: faq ? "PATCH" : "POST",
          body: JSON.stringify(toInput(values)),
          headers: { "Content-Type": "application/json" },
        },
      );
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
              setError(fieldError.field as keyof FaqFormValues, {
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

      toast.success(isEditing ? "FAQ diperbarui." : "FAQ ditambahkan.");
      setOpen(false);
      reset(defaultValues(faq));
      router.refresh();
    } catch {
      setError("root", {
        type: "network",
        message: "FAQ belum dapat disimpan. Silakan coba lagi.",
      });
    }
  });

  const formId = `faq-form-${faq?.id ?? "new"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen);
          if (nextOpen) reset(defaultValues(faq));
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            disabled={!isHydrated}
            size={isEditing ? "sm" : "default"}
            variant={isEditing ? "outline" : "default"}
          />
        }
      >
        {isEditing ? <Pencil aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}
        {isEditing ? "Edit" : "Tambah FAQ"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit FAQ" : "Tambah FAQ"}</DialogTitle>
          <DialogDescription>
            FAQ aktif membantu chatbot menjawab pertanyaan pelanggan secara konsisten.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" id={formId} noValidate onSubmit={submit}>
          <FormField
            {...(errors.question?.message ? { error: errors.question.message } : {})}
            htmlFor={`${formId}-question`}
            label="Pertanyaan"
            required
          >
            <Textarea
              id={`${formId}-question`}
              maxLength={300}
              rows={3}
              aria-invalid={Boolean(errors.question)}
              {...register("question")}
            />
          </FormField>
          <FormField
            {...(errors.answer?.message ? { error: errors.answer.message } : {})}
            htmlFor={`${formId}-answer`}
            label="Jawaban"
            required
          >
            <Textarea
              id={`${formId}-answer`}
              maxLength={1000}
              rows={5}
              aria-invalid={Boolean(errors.answer)}
              {...register("answer")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              {...(errors.category?.message ? { error: errors.category.message } : {})}
              htmlFor={`${formId}-category`}
              label="Kategori"
            >
              <Input
                id={`${formId}-category`}
                maxLength={100}
                aria-invalid={Boolean(errors.category)}
                {...register("category")}
              />
            </FormField>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Status FAQ</span>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex h-8 items-center gap-3 rounded-lg border px-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">
                      {field.value ? "Aktif" : "Nonaktif"}
                    </span>
                  </label>
                )}
              />
            </div>
          </div>
          {errors.root ? (
            <Alert variant="destructive">
              <AlertTitle>FAQ belum tersimpan</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <Button disabled={isSubmitting} form={formId} type="submit">
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            {isSubmitting ? "Menyimpan..." : "Simpan FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
