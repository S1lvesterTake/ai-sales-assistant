export function sessionExpiredHref(returnTo: string): string {
  return `/api/auth/session-expired?returnTo=${encodeURIComponent(returnTo)}`;
}
