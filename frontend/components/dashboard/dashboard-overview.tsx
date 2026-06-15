import Link from "next/link";
import {
  ArrowRight,
  MessageCircleQuestion,
  MessagesSquare,
  MousePointerClick,
  UserPlus,
  Users,
} from "lucide-react";

import { DashboardRetryButton } from "@/components/dashboard/dashboard-retry-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DashboardOverviewData,
  DashboardSummary,
  RecentConversation,
  RecentLead,
  TopQuestion,
} from "@/types/dashboard";
import type { LeadStatus } from "@/types/lead";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});

const leadStatus: Record<
  LeadStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  new: { label: "Baru", variant: "default" },
  contacted: { label: "Dihubungi", variant: "secondary" },
  qualified: { label: "Potensial", variant: "secondary" },
  closed: { label: "Selesai", variant: "outline" },
  lost: { label: "Tidak lanjut", variant: "outline" },
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Waktu tidak tersedia" : dateFormatter.format(date);
}

function WidgetFailure({ title }: { title: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center" role="alert">
      <p className="font-medium">{title} belum dapat dimuat</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        Widget lain tetap tersedia. Coba muat ulang bagian dashboard ini.
      </p>
      <div className="mt-4">
        <DashboardRetryButton />
      </div>
    </div>
  );
}

function WidgetHeader({
  href,
  title,
}: {
  href?: string;
  title: string;
}) {
  return (
    <CardHeader className="flex-row items-center justify-between border-b">
      <CardTitle>{title}</CardTitle>
      {href ? (
        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={href}>
          Lihat semua
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : null}
    </CardHeader>
  );
}

function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    { label: "Total lead", value: summary.totalLeads, icon: Users },
    { label: "Lead baru", value: summary.newLeads, icon: UserPlus },
    {
      label: "Percakapan",
      value: summary.totalChatSessions,
      icon: MessagesSquare,
    },
    {
      label: "Klik WhatsApp",
      value: summary.whatsappClicks,
      icon: MousePointerClick,
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan aktivitas bisnis">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardContent className="flex items-start justify-between gap-4 pt-1">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight">
                  {metric.value.toLocaleString("id-ID")}
                </dd>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </dl>
  );
}

function RecentLeads({ leads }: { leads: RecentLead[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        description="Lead dari chatbot dan input manual akan tampil di sini."
        title="Belum ada lead"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Calon pelanggan</TableHead>
          <TableHead>Minat</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Masuk</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <div className="font-medium">{lead.name ?? "Tanpa nama"}</div>
              <div className="text-xs text-muted-foreground">{lead.phone}</div>
            </TableCell>
            <TableCell className="max-w-64 whitespace-normal">
              {lead.interestSummary ?? "Belum ada ringkasan minat"}
            </TableCell>
            <TableCell>
              <Badge variant={leadStatus[lead.status].variant}>
                {leadStatus[lead.status].label}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(lead.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecentConversations({
  conversations,
}: {
  conversations: RecentConversation[];
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        description="Percakapan terbaru akan muncul setelah pelanggan memakai chatbot."
        icon={<MessagesSquare aria-hidden="true" className="size-6" />}
        title="Belum ada percakapan"
      />
    );
  }

  return (
    <ul className="divide-y" aria-label="Percakapan terbaru">
      {conversations.map((conversation) => (
        <li className="grid gap-1 px-5 py-4" key={conversation.sessionId}>
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">
              {conversation.customerName ?? "Pengunjung"}
            </p>
            <time className="text-xs text-muted-foreground" dateTime={conversation.lastMessageAt}>
              {formatDate(conversation.lastMessageAt)}
            </time>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {conversation.lastMessage}
          </p>
        </li>
      ))}
    </ul>
  );
}

function TopQuestions({ questions }: { questions: TopQuestion[] }) {
  if (questions.length === 0) {
    return (
      <EmptyState
        description="Pertanyaan populer akan dihitung setelah chatbot digunakan."
        icon={<MessageCircleQuestion aria-hidden="true" className="size-6" />}
        title="Belum ada pertanyaan populer"
      />
    );
  }

  return (
    <ol className="divide-y" aria-label="Pertanyaan paling sering diajukan">
      {questions.map((question, index) => (
        <li className="flex items-start gap-3 px-5 py-4" key={question.question}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 text-sm leading-6">{question.question}</p>
          <Badge variant="outline">{question.count} kali</Badge>
        </li>
      ))}
    </ol>
  );
}

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const allFailed = Object.values(data).every((result) => result.status === "error");

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<Badge variant="secondary">Data demo</Badge>}
        description="Pantau aktivitas chatbot dan peluang penjualan tanpa memuat seluruh dataset."
        eyebrow="Ringkasan bisnis"
        title="Dashboard Kopi Senja"
      />

      {allFailed ? (
        <EmptyState
          action={<DashboardRetryButton />}
          description="Layanan dashboard sedang tidak tersedia. Data bisnis tidak dihapus dan dapat dimuat kembali."
          title="Ringkasan belum dapat dimuat"
        />
      ) : (
        <>
          {data.summary.status === "success" ? (
            <SummaryCards summary={data.summary.data} />
          ) : (
            <Card>
              <WidgetFailure title="Ringkasan metrik" />
            </Card>
          )}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
            <Card>
              <WidgetHeader href="/dashboard/leads" title="Lead terbaru" />
              {data.recentLeads.status === "success" ? (
                <RecentLeads leads={data.recentLeads.data} />
              ) : (
                <WidgetFailure title="Lead terbaru" />
              )}
            </Card>

            <div className="grid gap-6">
              <Card>
                <WidgetHeader title="Percakapan terbaru" />
                {data.recentConversations.status === "success" ? (
                  <RecentConversations
                    conversations={data.recentConversations.data}
                  />
                ) : (
                  <WidgetFailure title="Percakapan terbaru" />
                )}
              </Card>
              <Card>
                <WidgetHeader href="/dashboard/faqs" title="Pertanyaan teratas" />
                {data.topQuestions.status === "success" ? (
                  <TopQuestions questions={data.topQuestions.data} />
                ) : (
                  <WidgetFailure title="Pertanyaan teratas" />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
