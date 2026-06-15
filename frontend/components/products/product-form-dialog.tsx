"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PackagePlus, Pencil } from "lucide-react";
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
import type { ApiErrorResponse } from "@/types/api";
import type { Product, ProductInput } from "@/types/product";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi.").max(150),
  description: z.string().trim().max(1000),
  price: z
    .string()
    .trim()
    .min(1, "Harga wajib diisi.")
    .refine((value) => Number.isInteger(Number(value)), "Harga harus berupa bilangan bulat.")
    .refine((value) => Number(value) >= 0, "Harga tidak boleh negatif."),
  category: z.string().trim().max(100),
  orderingInstruction: z.string().trim().max(1000),
  additionalNotes: z.string().trim().max(1000),
  isAvailable: z.boolean(),
});

type ProductFormValues = z.infer<typeof formSchema>;

function defaultValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    category: product?.category ?? "",
    orderingInstruction: product?.orderingInstruction ?? "",
    additionalNotes: product?.additionalNotes ?? "",
    isAvailable: product?.isAvailable ?? true,
  };
}

function toInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    price: Number(values.price),
    category: values.category.trim(),
    orderingInstruction: values.orderingInstruction.trim(),
    additionalNotes: values.additionalNotes.trim(),
    isAvailable: values.isAvailable,
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

export function ProductFormDialog({ product }: { product?: Product }) {
  const isEditing = Boolean(product);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ProductFormValues>({
    defaultValues: defaultValues(product),
    resolver: zodResolver(formSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      const response = await fetch(
        product
          ? `/api/dashboard/products/${encodeURIComponent(product.id)}`
          : "/api/dashboard/products",
        {
          method: product ? "PATCH" : "POST",
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
              setError(fieldError.field as keyof ProductFormValues, {
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

      toast.success(isEditing ? "Produk diperbarui." : "Produk ditambahkan.");
      setOpen(false);
      reset(defaultValues(product));
      router.refresh();
    } catch {
      setError("root", {
        type: "network",
        message: "Produk belum dapat disimpan. Silakan coba lagi.",
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen);
          if (nextOpen) reset(defaultValues(product));
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size={isEditing ? "sm" : "default"} variant={isEditing ? "outline" : "default"} />
        }
      >
        {isEditing ? <Pencil aria-hidden="true" /> : <PackagePlus aria-hidden="true" />}
        {isEditing ? "Edit" : "Tambah produk"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit produk" : "Tambah produk"}</DialogTitle>
          <DialogDescription>
            Informasi ini menjadi pengetahuan chatbot saat menjawab pelanggan.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" id={`product-form-${product?.id ?? "new"}`} noValidate onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              {...(errors.name?.message ? { error: errors.name.message } : {})}
              htmlFor={`product-name-${product?.id ?? "new"}`}
              label="Nama produk"
              required
            >
              <Input
                id={`product-name-${product?.id ?? "new"}`}
                maxLength={150}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
            <FormField
              {...(errors.price?.message ? { error: errors.price.message } : {})}
              htmlFor={`product-price-${product?.id ?? "new"}`}
              label="Harga (Rupiah)"
              required
            >
              <Input
                id={`product-price-${product?.id ?? "new"}`}
                inputMode="numeric"
                min="0"
                step="1"
                type="number"
                aria-invalid={Boolean(errors.price)}
                {...register("price")}
              />
            </FormField>
          </div>
          <FormField
            {...(errors.description?.message
              ? { error: errors.description.message }
              : {})}
            htmlFor={`product-description-${product?.id ?? "new"}`}
            label="Deskripsi"
          >
            <Textarea
              id={`product-description-${product?.id ?? "new"}`}
              maxLength={1000}
              rows={3}
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              {...(errors.category?.message
                ? { error: errors.category.message }
                : {})}
              htmlFor={`product-category-${product?.id ?? "new"}`}
              label="Kategori"
            >
              <Input
                id={`product-category-${product?.id ?? "new"}`}
                maxLength={100}
                {...register("category")}
              />
            </FormField>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Status ketersediaan</span>
              <Controller
                control={control}
                name="isAvailable"
                render={({ field }) => (
                  <label className="flex h-8 items-center gap-3 rounded-lg border px-3">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">
                      {field.value ? "Tersedia" : "Tidak tersedia"}
                    </span>
                  </label>
                )}
              />
            </div>
          </div>
          <FormField
            {...(errors.orderingInstruction?.message
              ? { error: errors.orderingInstruction.message }
              : {})}
            htmlFor={`product-ordering-${product?.id ?? "new"}`}
            label="Instruksi pemesanan"
          >
            <Textarea
              id={`product-ordering-${product?.id ?? "new"}`}
              maxLength={1000}
              rows={2}
              {...register("orderingInstruction")}
            />
          </FormField>
          <FormField
            {...(errors.additionalNotes?.message
              ? { error: errors.additionalNotes.message }
              : {})}
            htmlFor={`product-notes-${product?.id ?? "new"}`}
            label="Catatan tambahan"
          >
            <Textarea
              id={`product-notes-${product?.id ?? "new"}`}
              maxLength={1000}
              rows={2}
              {...register("additionalNotes")}
            />
          </FormField>
          {errors.root ? (
            <Alert variant="destructive">
              <AlertTitle>Produk belum tersimpan</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <Button disabled={isSubmitting} form={`product-form-${product?.id ?? "new"}`} type="submit">
            {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {isSubmitting ? "Menyimpan..." : "Simpan produk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
