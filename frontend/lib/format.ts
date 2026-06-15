const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value);
}
