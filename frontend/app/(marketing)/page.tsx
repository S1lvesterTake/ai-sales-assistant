import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { SectionHeading } from "@/components/marketing/section-heading";
import { TrackedWhatsappLink } from "@/components/marketing/tracked-whatsapp-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPublicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

type Lang = "id" | "en";

const content = {
  heroBadge: { id: "AI automation untuk bisnis lokal", en: "AI automation for local businesses" },
  heroTitle: {
    id: "Jawab pelanggan lebih cepat. Tangkap peluang penjualan lebih rapi.",
    en: "Answer customers faster. Capture sales opportunities more neatly.",
  },
  heroSubtitle: {
    id: "AI Sales Assistant membantu UMKM menjawab pertanyaan berulang, menyimpan calon pelanggan, dan meneruskan minat beli ke WhatsApp.",
    en: "AI Sales Assistant helps Indonesian small businesses answer repetitive questions, store potential customers, and forward buying interest to WhatsApp.",
  },
  heroCta1: { id: "Coba demo chatbot", en: "Try the demo chatbot" },
  heroCta2: { id: "Masuk dashboard", en: "Dashboard login" },
  heroBullets: {
    id: ["Bahasa Indonesia", "Demo tanpa login", "Data bisnis terkelola"],
    en: ["Indonesian language", "No-login demo", "Managed business data"],
  },
  problemEyebrow: { id: "Masalah yang diselesaikan", en: "Problems we solve" },
  problemTitle: {
    id: "Pelanggan menunggu, pemilik bisnis kewalahan.",
    en: "Customers are waiting, business owners are overwhelmed.",
  },
  problemDesc: {
    id: "UMKM sering menerima pertanyaan yang sama melalui banyak kanal. Ketika balasan terlambat, peluang pembelian ikut hilang.",
    en: "Small businesses often receive the same questions across many channels. When replies are late, purchase opportunities are lost.",
  },
  problems: {
    id: [
      "Pertanyaan harga dan stok datang berulang kali.",
      "Calon pelanggan hilang saat respons terlambat.",
      "Data lead tercecer di banyak percakapan.",
    ],
    en: [
      "Price and stock questions arrive repeatedly.",
      "Potential customers are lost when responses are delayed.",
      "Lead data is scattered across many conversations.",
    ],
  },
  stepsEyebrow: { id: "Cara kerja", en: "How it works" },
  stepsTitle: {
    id: "Dari pengetahuan bisnis menjadi percakapan yang siap ditindaklanjuti.",
    en: "From business knowledge to actionable conversations.",
  },
  stepsDesc: {
    id: "Alur sederhana untuk pemilik bisnis dan pengalaman cepat untuk pelanggan.",
    en: "Simple workflow for business owners, fast experience for customers.",
  },
  steps: {
    id: [
      { number: "01", title: "Isi pengetahuan bisnis", desc: "Pemilik menambahkan profil, produk, dan FAQ dari dashboard." },
      { number: "02", title: "AI menjawab pelanggan", desc: "Chatbot memberi jawaban Bahasa Indonesia berdasarkan data bisnis." },
      { number: "03", title: "Peluang diteruskan", desc: "Minat beli dicatat sebagai lead dan diarahkan ke WhatsApp." },
    ],
    en: [
      { number: "01", title: "Fill in business knowledge", desc: "Owners add their profile, products, and FAQs from the dashboard." },
      { number: "02", title: "AI answers customers", desc: "The chatbot gives Bahasa Indonesia answers based on business data." },
      { number: "03", title: "Leads are handed off", desc: "Buying interest is recorded as a lead and routed to WhatsApp." },
    ],
  },
  featuresEyebrow: { id: "Fitur inti", en: "Core features" },
  featuresTitle: {
    id: "Cukup untuk membuktikan alur penjualan end to end.",
    en: "Enough to prove the end-to-end sales flow.",
  },
  featuresDesc: {
    id: "Chatbot publik, lead capture, WhatsApp handoff, serta dashboard pengelolaan berada dalam satu produk terintegrasi.",
    en: "Public chatbot, lead capture, WhatsApp handoff, and management dashboard in one integrated product.",
  },
  features: {
    id: [
      { icon: Bot, title: "Jawaban berbasis data", desc: "Respons memakai konteks produk, FAQ, dan profil bisnis yang dikelola pemilik." },
      { icon: UsersRound, title: "Lead lebih terstruktur", desc: "Nama, nomor WhatsApp, minat, dan status tindak lanjut tersimpan rapi." },
      { icon: MessageSquareText, title: "Handoff ke WhatsApp", desc: "Pelanggan yang siap membeli dapat melanjutkan ke kanal penjualan utama." },
      { icon: Gauge, title: "Dashboard ringkas", desc: "Pemilik melihat percakapan, lead baru, pertanyaan populer, dan klik WhatsApp." },
    ],
    en: [
      { icon: Bot, title: "Data-driven answers", desc: "Responses use product context, FAQs, and business profiles managed by the owner." },
      { icon: UsersRound, title: "Structured leads", desc: "Name, WhatsApp number, interest, and follow-up status are neatly stored." },
      { icon: MessageSquareText, title: "WhatsApp handoff", desc: "Customers ready to buy can continue to the main sales channel." },
      { icon: Gauge, title: "Simple dashboard", desc: "Owners see conversations, new leads, popular questions, and WhatsApp clicks." },
    ],
  },
  demoEyebrow: { id: "Demo Kopi Senja", en: "Kopi Senja Demo" },
  demoTitle: {
    id: "Lihat pengalaman pelanggan dan pemilik bisnis.",
    en: "See the customer and business owner experience.",
  },
  demoDesc: {
    id: "Data demo deterministik menunjukkan bagaimana pertanyaan produk berubah menjadi percakapan, lead, dan tindakan WhatsApp.",
    en: "Deterministic demo data shows how product questions turn into conversations, leads, and WhatsApp action.",
  },
  demoBtn1: { id: "Buka demo", en: "Open demo" },
  demoBtn2: { id: "Gunakan akun demo dashboard", en: "Use demo dashboard account" },
  ctaEyebrow: { id: "Siap melanjutkan percakapan", en: "Ready to continue the conversation" },
  ctaTitle: {
    id: "Coba jalur penjualan dari chatbot sampai WhatsApp.",
    en: "Try the sales flow from chatbot to WhatsApp.",
  },
  ctaDesc: {
    id: "Tracking berjalan best-effort. Tautan WhatsApp tetap terbuka meskipun layanan analytics tidak tersedia.",
    en: "Tracking is best-effort. The WhatsApp link remains open even if the analytics service is unavailable.",
  },
  ctaButton: { id: "Hubungi Kopi Senja", en: "Contact Kopi Senja" },
  portfolioEyebrow: { id: "Engineering portfolio", en: "Engineering portfolio" },
  portfolioTitle: {
    id: "Produk bisnis dengan keputusan arsitektur yang dapat dipertanggungjawabkan.",
    en: "A business product with defensible architecture decisions.",
  },
  portfolioDesc: {
    id: "Implementasi menekankan API terstruktur, keamanan ownership, idempotensi chat, database constraints, testing deterministik, dan deployment container.",
    en: "The implementation emphasizes structured APIs, ownership security, chat idempotency, database constraints, deterministic testing, and container deployment.",
  },
  portfolioBtns: {
    id: { swagger: "Buka Swagger API", repo: "Lihat repository", demo: "Mulai dari demo" },
    en: { swagger: "Open Swagger API", repo: "View repository", demo: "Start from demo" },
  },
};

const techLabels = [
  { icon: Blocks, label: "Next.js + NestJS" },
  { icon: Database, label: "PostgreSQL + Drizzle" },
  { icon: ShieldCheck, label: "JWT + ownership scope" },
  { icon: FileCheck2, label: "DTO · Swagger · testing" },
] as const;

export const metadata: Metadata = {
  title: "AI Sales Assistant untuk UMKM — for Indonesian Small Businesses",
  description:
    "Chatbot AI membantu UMKM menjawab pelanggan, menangkap lead, dan handoff ke WhatsApp. | AI chatbot for Indonesian MSMEs — answer customers, capture leads, handoff to WhatsApp.",
  openGraph: {
    title: "AI Sales Assistant untuk UMKM — for Indonesian Small Businesses",
    description: "Otomatisasi percakapan pelanggan untuk UMKM. | Customer conversation automation for Indonesian MSMEs.",
    locale: "id_ID",
    type: "website",
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  const lang: Lang = langCookie === "en" ? "en" : "id";

  const t = <K extends keyof typeof content>(key: K) =>
    (content[key] as Record<Lang, unknown>)[lang];

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
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklch,var(--color-secondary)_75%,transparent),transparent_55%)]" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-14 px-6 py-20 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-24">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="rounded-full px-3 py-1.5">
                <Sparkles aria-hidden="true" />
                {t("heroBadge") as string}
              </Badge>
              <LanguageSwitcher currentLang={lang} />
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {t("heroTitle") as string}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("heroSubtitle") as string}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo-chat"
                className={buttonVariants({ size: "lg" })}
              >
                {t("heroCta1") as string}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                {t("heroCta2") as string}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {(t("heroBullets") as string[]).map((item: string) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ChatPreview />
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="border-b bg-card py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:items-center lg:px-12">
          <SectionHeading
            eyebrow={t("problemEyebrow") as string}
            title={t("problemTitle") as string}
            description={t("problemDesc") as string}
          />
          <div className="grid gap-3">
            {(t("problems") as string[]).map((problem: string) => (
              <div className="flex gap-4 rounded-2xl border bg-background p-5" key={problem}>
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive">
                  !
                </span>
                <p className="leading-7">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="cara-kerja" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            align="center"
            eyebrow={t("stepsEyebrow") as string}
            title={t("stepsTitle") as string}
            description={t("stepsDesc") as string}
          />
          <ol className="mt-14 grid gap-5 lg:grid-cols-3">
            {(t("steps") as Array<{ number: string; title: string; desc: string }>).map((step) => (
              <li className="rounded-3xl border bg-card p-7" key={step.number}>
                <span className="text-sm font-semibold text-primary">{step.number}</span>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fitur" className="scroll-mt-20 border-y bg-muted/45 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            eyebrow={t("featuresEyebrow") as string}
            title={t("featuresTitle") as string}
            description={t("featuresDesc") as string}
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {(t("features") as Array<{ icon: React.ComponentType<{ className?: string }>; title: string; desc: string }>).map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="rounded-3xl border bg-card p-7" key={feature.title}>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Demo Preview ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <SectionHeading
            eyebrow={t("demoEyebrow") as string}
            title={t("demoTitle") as string}
            description={t("demoDesc") as string}
          />
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
            <ChatPreview />
            <DashboardPreview />
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo-chat" className={buttonVariants({ size: "lg" })}>
              {t("demoBtn1") as string} {demoSlug}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("demoBtn2") as string}
            </Link>
          </div>
        </div>
      </section>

      {/* ── WhatsApp CTA ── */}
      <section className="border-y bg-primary py-20 text-primary-foreground sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              {t("ctaEyebrow") as string}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
              {t("ctaTitle") as string}
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-primary-foreground/75">
              {t("ctaDesc") as string}
            </p>
          </div>
          <TrackedWhatsappLink
            businessSlug={demoSlug}
            href={whatsappUrl}
            className="bg-white text-primary hover:bg-white/90"
          >
            {t("ctaButton") as string}
          </TrackedWhatsappLink>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
          <div className="rounded-[2rem] border bg-card p-7 sm:p-10 lg:p-12">
            <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
              <SectionHeading
                eyebrow={t("portfolioEyebrow") as string}
                title={t("portfolioTitle") as string}
                description={t("portfolioDesc") as string}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {techLabels.map((item) => {
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
              <a href={apiDocsUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                {(t("portfolioBtns") as Record<string, string>).swagger}
              </a>
              {environment.NEXT_PUBLIC_REPOSITORY_URL ? (
                <a href={environment.NEXT_PUBLIC_REPOSITORY_URL} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                  {(t("portfolioBtns") as Record<string, string>).repo}
                </a>
              ) : null}
              <Link href="/demo-chat" className={cn(buttonVariants(), "sm:ml-auto")}>
                {(t("portfolioBtns") as Record<string, string>).demo}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
