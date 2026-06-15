const CANONICAL_PHONE_PATTERN = /^62[0-9]{8,13}$/;
const ALLOWED_SEPARATORS_PATTERN = /[\s().-]/g;

export class InvalidIndonesianPhoneError extends Error {
  constructor() {
    super('Nomor WhatsApp Indonesia tidak valid');
    this.name = InvalidIndonesianPhoneError.name;
  }
}

export function normalizeIndonesianPhone(input: string): string {
  const compact = input.trim().replace(ALLOWED_SEPARATORS_PATTERN, '');
  if (!compact || /[^+0-9]/.test(compact) || compact.slice(1).includes('+')) {
    throw new InvalidIndonesianPhoneError();
  }

  let canonical: string;
  if (compact.startsWith('+62')) {
    canonical = compact.slice(1);
  } else if (compact.startsWith('62')) {
    canonical = compact;
  } else if (compact.startsWith('08')) {
    canonical = `62${compact.slice(1)}`;
  } else {
    throw new InvalidIndonesianPhoneError();
  }

  if (!CANONICAL_PHONE_PATTERN.test(canonical)) {
    throw new InvalidIndonesianPhoneError();
  }
  return canonical;
}

export function isIndonesianPhone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    normalizeIndonesianPhone(value);
    return true;
  } catch {
    return false;
  }
}
