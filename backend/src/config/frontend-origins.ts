export function parseFrontendOrigins(value: string): string[] {
  return value.split(',').map((origin) => origin.trim());
}
