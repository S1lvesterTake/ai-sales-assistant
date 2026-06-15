import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import type { LeadStatus } from "@/types/lead";

export const leadStatusOptions: Array<{
  value: LeadStatus;
  label: string;
}> = [
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Dihubungi" },
  { value: "qualified", label: "Potensial" },
  { value: "closed", label: "Selesai" },
  { value: "lost", label: "Tidak lanjut" },
];

export function leadStatusLabel(status: LeadStatus): string {
  return leadStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function formatLeadPhone(value: string): string {
  const phone = normalizeIndonesianPhone(value);
  if (!phone) return "Nomor tidak valid";
  const local = phone.slice(2);
  const first = local.slice(0, 3);
  const middle = local.slice(3, 7);
  const last = local.slice(7);
  return [`+62 ${first}`, middle, last].filter(Boolean).join("-");
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Makassar",
});

export function formatLeadDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : dateFormatter.format(date);
}

export function leadWhatsappHref(phone: string, name?: string): string | null {
  const normalized = normalizeIndonesianPhone(phone);
  if (!normalized) return null;
  const greeting = name?.trim() ? `Halo ${name.trim()}` : "Halo Kak";
  const url = new URL(`https://wa.me/${normalized}`);
  url.searchParams.set(
    "text",
    `${greeting}, terima kasih sudah menghubungi kami. Apakah ada yang bisa kami bantu lebih lanjut?`,
  );
  return url.toString();
}
