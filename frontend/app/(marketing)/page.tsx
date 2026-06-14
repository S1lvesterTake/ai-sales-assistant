import type { Metadata } from "next";

import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Bot,
  CheckCircle2,
  Database,
  FileCheck2,
  Gauge,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { ChatPreview } from "@/components/marketing/chat-preview";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TrackedWhatsappLink } from "@/components/marketing/tracked-whatsapp-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPublicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Sales Assistant untuk UMKM",
  description:
    "Chatbot AI untuk membantu UMKM menjawab pelanggan, menangkap lead, dan meneruskan calon pembeli ke WhatsApp.",
  openGraph: {
    title: "AI Sales Assistant untuk UMKM",
    description:
      "Otomatisasi percakapan pelanggan dan rapikan peluang penjualan UMKM.",
    locale: "id_ID",
    type: "website",
  },
};

const problems = [
  "Pertanyaan harga dan stok datang berulang kali.",
  "Calon pelanggan hilang saat respons terlambat.",
  "Data lead tercecer di banyak percakapan.",
] as const;

const steps = [
  {
    number: "01",
    title: "Isi pengetahuan bisnis",
    description: "Pemilik menambahkan profil, produk, dan FAQ dari dashboard.",
  },
  {
    number: "02",
    title: "AI menjawab pelanggan",
    description: "Chatbot memberi jawaban Bahasa Indonesia berdasarkan data bisnis.",
  },
  {
    number: "03",
    title: "Peluang diteruskan",
    description: "Minat beli dicatat sebagai lead dan diarahkan ke WhatsApp.",
  },
] as const;

const features = [
  {
    icon: Bot,
    title: "Jawaban berbasis data",
    description:
      "Respons memakai konteks produk, FAQ, dan profil bisnis yang dikelola pemilik.",
  },
  {
    icon: UsersRound,
    title: "Lead lebih terstruktur",
    description:
      "Nama, nomor WhatsApp, minat, dan status tindak lanjut tersimpan rapi.",
  },
  {
    icon: MessageSquareText,
    title: "Handoff ke WhatsApp",
    description:
      "Pelanggan yang siap membeli dapat melanjutkan ke kanal penjualan utama.",
  },
  {
    icon: Gauge,
    title: "Dashboard ringkas",
    description:
      "Pemilik melihat percakapan, lead baru, pertanyaan populer, dan klik WhatsApp.",
  },
] as const;

const technicalProof = [
  { icon: Blocks, label: "Next.js + NestJS" },
  { icon: Database, label: "PostgreSQL + Drizzle" },
  { icon: ShieldCheck, label: "JWT dan ownership scope" },
  { icon: FileCheck2, label: "DTO, Swagger, dan testing" },
] as const;

export default function HomePage() {
  const environment = getPublicEnv();
  const demoSlug = environment.NEXT_PUBLIC_DEMO_BUSINESS_SLUG;
  const apiDocsUrl = new URL(
    "/api/docs",
    environment.NEXT_PUBLIC_API_BASE_URL,
  ).toString();
  const whatsappUrl =
    "https://wa.me/6281234567890?text=Halo%2C%20saya%20ingin%20mencoba%20Kopi%20Senja";

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklch,var(--color-secondary)_75%,transparent),transparent_55%)]" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-14 px-6 py-20 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-24">
          <div>
            <Badge
              variant="secondary"
              className="mb-6 rounded-full px-3 py-1.5"
            >
              <Sparkles aria-hidden="true" />
              AI automation untuk bisnis lokal
            </Badge>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Jawab pelanggan lebih cepat. Tangkap peluang penjualan lebih rapi.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              AI Sales Assistant membantu UMKM menjawab pertanyaan berulang,
              menyimpan calon pelanggan, dan meneruskan minat beli ke WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo-chat"
                className={buttonVariants({ size: "lg" })}
              >
                Coba demo chatbot
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                })}
              >
                Masuk dashboard
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                "Bahasa Indonesia",
                "Demo tanpa login",
                "Data bisnis terkelola",
              ].map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ChatPreview />
        </div>
      </section>

      <section className="border-b bg-card py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:items-center lg:px-12">
          <SectionHeading
            eyebrow="Masalah yang diselesaikan"
            title="Pelanggan menunggu, pemilik bisnis kewalahan."
            description="UMKM sering menerima pertanyaan yang sama melalui banyak kanal. Ketika balasan terlambat, peluang pembelian ikut hilang."
          />
          <div className="grid gap-3">
            {problems.map((problem) => (
              <div
                className="flex gap-4 rounded-2xl border bg-background p-5"
                key={problem}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive">
                  !
                </span>
                <p className="leading-7">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            align="center"
            eyebrow="Cara kerja"
            title="Dari pengetahuan bisnis menjadi percakapan yang siap ditindaklanjuti."
            description="Alur sederhana untuk pemilik bisnis dan pengalaman cepat untuk pelanggan."
          />
          <ol className="mt-14 grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <li className="rounded-3xl border bg-card p-7" key={step.number}>
                <span className="text-sm font-semibold text-primary">
                  {step.number}
                </span>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="fitur"
        className="scroll-mt-20 border-y bg-muted/45 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            eyebrow="Fitur inti"
            title="Cukup untuk membuktikan alur penjualan end to end."
            description="Chatbot publik, lead capture, WhatsApp handoff, serta dashboard pengelolaan berada dalam satu produk terintegrasi."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  className="rounded-3xl border bg-card p-7"
                  key={feature.title}
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            eyebrow="Demo Kopi Senja"
            title="Lihat pengalaman pelanggan dan pemilik bisnis."
            description="Data demo deterministik menunjukkan bagaimana pertanyaan produk berubah menjadi percakapan, lead, dan tindakan WhatsApp."
          />
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
            <ChatPreview />
            <DashboardPreview />
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo-chat"
              className={buttonVariants({ size: "lg" })}
            >
              Buka demo {demoSlug}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
              })}
            >
              Gunakan akun demo dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y bg-primary py-20 text-primary-foreground sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Siap melanjutkan percakapan
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
              Coba jalur penjualan dari chatbot sampai WhatsApp.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-primary-foreground/75">
              Tracking berjalan best-effort. Tautan WhatsApp tetap terbuka
              meskipun layanan analytics tidak tersedia.
            </p>
          </div>
          <TrackedWhatsappLink
            businessSlug={demoSlug}
            href={whatsappUrl}
            className="bg-white text-primary hover:bg-white/90"
          >
            Hubungi Kopi Senja
          </TrackedWhatsappLink>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <div className="rounded-[2rem] border bg-card p-7 sm:p-10 lg:p-12">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
              <SectionHeading
                eyebrow="Engineering portfolio"
                title="Produk bisnis dengan keputusan arsitektur yang dapat dipertanggungjawabkan."
                description="Implementasi menekankan API terstruktur, keamanan ownership, idempotensi chat, database constraints, testing deterministik, dan deployment container."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {technicalProof.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="rounded-2xl bg-muted/65 p-5" key={item.label}>
                      <Icon aria-hidden="true" className="size-5 text-primary" />
                      <p className="mt-4 text-sm font-semibold">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 border-t pt-8">
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Buka Swagger API
              </a>
              {environment.NEXT_PUBLIC_REPOSITORY_URL ? (
                <a
                  href={environment.NEXT_PUBLIC_REPOSITORY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Lihat repository
                </a>
              ) : null}
              <Link
                href="/demo-chat"
                className={cn(buttonVariants(), "sm:ml-auto")}
              >
                Mulai dari demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
