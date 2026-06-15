import Link from "next/link";
import { FilterX, PackageOpen } from "lucide-react";

import {
  ProductActions,
  ProductAvailabilityToggle,
} from "@/components/products/product-actions";
import { DashboardRetryButton } from "@/components/dashboard/dashboard-retry-button";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import {
  productPageHref,
  type ProductFilters,
} from "@/lib/products/query";
import type { PaginationMeta } from "@/types/api";
import type { Product } from "@/types/product";

export function ProductsPage({
  error,
  filters,
  meta,
  products,
}: {
  error?: boolean;
  filters: ProductFilters;
  meta: PaginationMeta;
  products: Product[];
}) {
  const hasFilters =
    Boolean(filters.category) || filters.availability !== "all";

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<ProductFormDialog />}
        description="Produk aktif menjadi sumber pengetahuan utama saat chatbot menjawab harga dan cara pemesanan."
        eyebrow="Pengetahuan chatbot"
        title="Produk"
      />

      <Card>
        <CardContent className="pt-1">
          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto]" method="get">
            <div>
              <label className="sr-only" htmlFor="product-category-filter">
                Filter kategori
              </label>
              <Input
                defaultValue={filters.category}
                id="product-category-filter"
                key={filters.category}
                maxLength={100}
                name="category"
                placeholder="Filter kategori, contoh: Kopi"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="product-availability-filter">
                Filter ketersediaan
              </label>
              <select
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue={
                  filters.availability === "available"
                    ? "true"
                    : filters.availability === "unavailable"
                      ? "false"
                      : ""
                }
                id="product-availability-filter"
                name="isAvailable"
              >
                <option value="">Semua status</option>
                <option value="true">Tersedia</option>
                <option value="false">Tidak tersedia</option>
              </select>
            </div>
            <Button type="submit">Terapkan</Button>
            {hasFilters ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/dashboard/products"
              >
                <FilterX aria-hidden="true" />
                Reset
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {error ? (
        <EmptyState
          action={<DashboardRetryButton />}
          description="Layanan produk sedang tidak tersedia. Data yang sudah tersimpan tidak berubah."
          title="Produk belum dapat dimuat"
        />
      ) : products.length === 0 ? (
        <EmptyState
          action={hasFilters ? <Link className={buttonVariants()} href="/dashboard/products">Lihat semua produk</Link> : <ProductFormDialog />}
          description={
            hasFilters
              ? "Tidak ada produk yang cocok dengan kategori atau status ini."
              : "Tambahkan produk pertama agar chatbot dapat menjawab informasi penawaran bisnis."
          }
          icon={<PackageOpen aria-hidden="true" className="size-6" />}
          title={hasFilters ? "Produk tidak ditemukan" : "Belum ada produk"}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Ketersediaan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="max-w-sm whitespace-normal">
                        <p className="font-medium">{product.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {product.description || "Tanpa deskripsi"}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatRupiah(product.price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category || "Tanpa kategori"}</Badge>
                      </TableCell>
                      <TableCell>
                        <ProductAvailabilityToggle product={product} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ProductActions product={product} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-4 md:hidden">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="grid gap-4 pt-1">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{product.name}</h2>
                      <Badge variant="outline">{product.category || "Lainnya"}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {product.description || "Tanpa deskripsi"}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">{formatRupiah(product.price)}</p>
                  <ProductAvailabilityToggle product={product} />
                  <ProductActions product={product} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {products.length} dari {meta.total} produk
            </p>
            <nav aria-label="Pagination produk" className="flex items-center gap-2">
              {meta.page > 1 ? (
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={productPageHref(meta.page - 1, filters)}>
                  Sebelumnya
                </Link>
              ) : null}
              <span className="text-sm">Halaman {meta.page} dari {Math.max(meta.totalPages, 1)}</span>
              {meta.page < meta.totalPages ? (
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={productPageHref(meta.page + 1, filters)}>
                  Berikutnya
                </Link>
              ) : null}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
