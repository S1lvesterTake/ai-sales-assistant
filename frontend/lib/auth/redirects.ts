const DEFAULT_DASHBOARD_PATH = "/dashboard";

export function getSafeDashboardReturnTo(
  value: string | null | undefined,
): string {
  if (!value || /[\u0000-\u001F\\]/.test(value)) {
    return DEFAULT_DASHBOARD_PATH;
  }

  try {
    const url = new URL(value, "https://frontend.local");
    const isRelative = value.startsWith("/") && !value.startsWith("//");
    const isDashboardPath =
      url.pathname === DEFAULT_DASHBOARD_PATH ||
      url.pathname.startsWith(`${DEFAULT_DASHBOARD_PATH}/`);

    return isRelative && url.origin === "https://frontend.local" && isDashboardPath
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_DASHBOARD_PATH;
  } catch {
    return DEFAULT_DASHBOARD_PATH;
  }
}
