import { FilterX, MessageCircle, Users } from "lucide-react";
import Link from "next/link";

import { DashboardRetryButton } from "@/components/dashboard/dashboard-retry-button";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadStatusSelect } from "@/components/leads/lead-status-select";
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
import {
  formatLeadDate,
  formatLeadPhone,
  leadStatusOptions,
  leadWhatsappHref,
} from "@/lib/leads/display";
import { leadPageHref, type LeadFilters } from "@/lib/leads/query";
import type { PaginationMeta } from "@/types/api";
import type { Lead } from "@/types/lead";

function LeadWhatsappLink({ lead }: { lead: Lead }) {
  const href = leadWhatsappHref(lead.phone, lead.name);
  if (!href) return null;
  return (
    <a
      aria-label={`WhatsApp ${lead.name || lead.phone}`}
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" />
      WhatsApp
    </a>
  );
}

function leadClientSummary(lead: Lead) {
  return {
    id: lead.id,
    phone: lead.phone,
    status: lead.status,
    createdAt: lead.createdAt,
    ...(lead.name !== undefined ? { name: lead.name } : {}),
    ...(lead.source !== undefined ? { source: lead.source } : {}),
    ...(lead.interestSummary !== undefined
      ? { interestSummary: lead.interestSummary }
      : {}),
  };
}

export function LeadsPage({
  error,
  leads,
  filters,
  meta,
}: {
  error?: boolean;
  leads: Lead[];
  filters: LeadFilters;
  meta: PaginationMeta;
}) {
  const hasFilters = Boolean(filters.search) || filters.status !== "all";

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<LeadFormDialog />}
        description="Tinjau calon pelanggan, pahami minatnya, dan catat progres tindak lanjut penjualan."
        eyebrow="Pipeline penjualan"
        title="Lead"
      />

      <Card>
        <CardContent className="pt-1">
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto]"
            method="get"
          >
            <div>
              <label className="sr-only" htmlFor="lead-search-filter">
                Cari lead
              </label>
              <Input
                defaultValue={filters.search}
                id="lead-search-filter"
                key={filters.search}
                maxLength={100}
                name="search"
                placeholder="Cari nama, nomor, atau minat"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="lead-status-filter">
                Filter status lead
              </label>
              <select
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue={filters.status === "all" ? "" : filters.status}
                id="lead-status-filter"
                name="status"
              >
                <option value="">Semua status</option>
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Terapkan</Button>
            {hasFilters ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/dashboard/leads"
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
          description="Layanan lead sedang tidak tersedia. Data pelanggan yang sudah tersimpan tidak berubah."
          title="Lead belum dapat dimuat"
        />
      ) : leads.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? (
              <Link className={buttonVariants()} href="/dashboard/leads">
                Lihat semua lead
              </Link>
            ) : (
              <LeadFormDialog />
            )
          }
          description={
            hasFilters
              ? "Tidak ada lead yang cocok dengan pencarian atau status ini."
              : "Lead dari chatbot akan tampil di sini. Anda juga dapat menambah lead secara manual."
          }
          icon={<Users aria-hidden="true" className="size-6" />}
          title={hasFilters ? "Lead tidak ditemukan" : "Belum ada lead"}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Minat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <p className="font-medium">{lead.name || "Tanpa nama"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatLeadPhone(lead.phone)}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-sm whitespace-normal">
                        <p className="line-clamp-2 text-sm">
                          {lead.interestSummary || "Belum ada ringkasan minat"}
                        </p>
                        <Badge className="mt-2" variant="outline">
                          {lead.source === "chatbot" ? "Chatbot" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="grid gap-2">
                          <LeadStatusBadge status={lead.status} />
                          <LeadStatusSelect lead={leadClientSummary(lead)} />
                        </div>
                      </TableCell>
                      <TableCell>{formatLeadDate(lead.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <LeadDetailDialog
                            hasLinkedConversation={Boolean(lead.chatSessionId)}
                            lead={leadClientSummary(lead)}
                          />
                          <LeadWhatsappLink lead={lead} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-4 md:hidden">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="grid gap-4 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{lead.name || "Tanpa nama"}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatLeadPhone(lead.phone)}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <p className="text-sm leading-6">
                    {lead.interestSummary || "Belum ada ringkasan minat"}
                  </p>
                  <LeadStatusSelect lead={leadClientSummary(lead)} />
                  <div className="flex flex-wrap gap-2">
                    <LeadDetailDialog
                      hasLinkedConversation={Boolean(lead.chatSessionId)}
                      lead={leadClientSummary(lead)}
                    />
                    <LeadWhatsappLink lead={lead} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {leads.length} dari {meta.total} lead
            </p>
            <nav aria-label="Pagination lead" className="flex items-center gap-2">
              {meta.page > 1 ? (
                <Link
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={leadPageHref(meta.page - 1, filters)}
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
                  href={leadPageHref(meta.page + 1, filters)}
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
