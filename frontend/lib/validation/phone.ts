export function normalizeIndonesianPhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("+62")
    ? compact.slice(1)
    : compact.startsWith("08")
      ? `62${compact.slice(1)}`
      : compact;

  return /^62[0-9]{8,13}$/.test(normalized) ? normalized : null;
}
