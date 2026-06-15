import { CircleHelp, FilterX } from "lucide-react";
import Link from "next/link";

import { DashboardRetryButton } from "@/components/dashboard/dashboard-retry-button";
import { FaqActions, FaqActiveToggle } from "@/components/faqs/faq-actions";
import { FaqFormDialog } from "@/components/faqs/faq-form-dialog";
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
import { faqPageHref, type FaqFilters } from "@/lib/faqs/query";
import type { PaginationMeta } from "@/types/api";
import type { Faq } from "@/types/faq";

export function FaqsPage({
  error,
  faqs,
  filters,
  meta,
}: {
  error?: boolean;
  faqs: Faq[];
  filters: FaqFilters;
  meta: PaginationMeta;
}) {
  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.category) ||
    filters.activeStatus !== "all";

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<FaqFormDialog />}
        description="FAQ aktif memberi chatbot jawaban konsisten untuk pertanyaan pelanggan yang berulang."
        eyebrow="Pengetahuan chatbot"
        title="FAQ"
      />

      <Card>
        <CardContent className="pt-1">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_11rem_auto_auto]"
            method="get"
          >
            <div>
              <label className="sr-only" htmlFor="faq-search-filter">
                Cari FAQ
              </label>
              <Input
                defaultValue={filters.search}
                id="faq-search-filter"
                key={filters.search}
                maxLength={300}
                name="search"
                placeholder="Cari pertanyaan atau jawaban"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="faq-category-filter">
                Filter kategori FAQ
              </label>
              <Input
                defaultValue={filters.category}
                id="faq-category-filter"
                key={filters.category}
                maxLength={100}
                name="category"
                placeholder="Kategori"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="faq-active-filter">
                Filter status FAQ
              </label>
              <select
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue={
                  filters.activeStatus === "active"
                    ? "true"
                    : filters.activeStatus === "inactive"
                      ? "false"
                      : ""
                }
                id="faq-active-filter"
                name="isActive"
              >
                <option value="">Semua status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <Button type="submit">Terapkan</Button>
            {hasFilters ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/dashboard/faqs"
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
          description="Layanan FAQ sedang tidak tersedia. Data yang sudah tersimpan tidak berubah."
          title="FAQ belum dapat dimuat"
        />
      ) : faqs.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? (
              <Link className={buttonVariants()} href="/dashboard/faqs">
                Lihat semua FAQ
              </Link>
            ) : (
              <FaqFormDialog />
            )
          }
          description={
            hasFilters
              ? "Tidak ada FAQ yang cocok dengan pencarian, kategori, atau status ini."
              : "Tambahkan FAQ pertama agar chatbot dapat menjawab pertanyaan pelanggan dengan konsisten."
          }
          icon={<CircleHelp aria-hidden="true" className="size-6" />}
          title={hasFilters ? "FAQ tidak ditemukan" : "Belum ada FAQ"}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pertanyaan dan jawaban</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="max-w-xl whitespace-normal">
                        <p className="font-medium">{faq.question}</p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                          {faq.answer}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {faq.category || "Tanpa kategori"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FaqActiveToggle faq={faq} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <FaqActions faq={faq} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-4 md:hidden">
            {faqs.map((faq) => (
              <Card key={faq.id}>
                <CardContent className="grid gap-4 pt-1">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{faq.question}</h2>
                      <Badge variant="outline">
                        {faq.category || "Lainnya"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                  <FaqActiveToggle faq={faq} />
                  <FaqActions faq={faq} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {faqs.length} dari {meta.total} FAQ
            </p>
            <nav aria-label="Pagination FAQ" className="flex items-center gap-2">
              {meta.page > 1 ? (
                <Link
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={faqPageHref(meta.page - 1, filters)}
                >
                  Sebelumnya
                </Link>
              ) : null}
              <span className="text-sm">
                Halaman {meta.page} dari {Math.max(meta.totalPages, 1)}
              </span>
              {meta.page < meta.totalPages ? (
                <Link
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={faqPageHref(meta.page + 1, filters)}
                >
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
