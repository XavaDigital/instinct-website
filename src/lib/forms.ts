/**
 * Shared, framework-free form rules. Imported by both the React islands
 * (client) and the API endpoints (server) so validation stays in one place.
 */

export const ARTWORK_ACCEPT = '.png,.jpg,.jpeg,.pdf,.ai,.eps,.svg,.zip';
export const ARTWORK_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'ai', 'eps', 'svg', 'zip'];
export const ARTWORK_MAX_FILES = 5;
/** Mailgun caps a message at 25MB; leave room for the body and encoding. */
export const ARTWORK_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

/** Chip options on the quote form. "Other" reveals a free-text field. */
export const GARMENT_OPTIONS = [
  'Jerseys',
  'Singlets',
  'Hoodies',
  'Jackets',
  'Training tees',
  'Shorts',
  'Socks',
  'Headwear',
  'Bags',
  'Other',
] as const;
export const GARMENT_OTHER = 'Other';

/** Last option in the sport select; reveals a free-text field. */
export const SPORT_OTHER = 'Other / multiple';

/** Maximum accepted length per field; enforced on the client and the server. */
export const LIMITS = {
  name: 120,
  role: 120,
  email: 200,
  phone: 40,
  org: 160,
  sport: 80,
  sportOther: 120,
  garmentsOther: 200,
  quantity: 80,
  neededBy: 60,
  notes: 3000,
  message: 4000,
} as const;

/** WHATWG HTML "valid e-mail address" pattern, plus a required dot in the domain. */
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= LIMITS.email && EMAIL_RE.test(v);
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message for a set of artwork files, or null if acceptable. */
export function validateArtwork(files: { name: string; size: number }[]): string | null {
  if (files.length > ARTWORK_MAX_FILES) return `Please attach no more than ${ARTWORK_MAX_FILES} files.`;
  const bad = files.find((f) => !ARTWORK_EXTENSIONS.includes(fileExtension(f.name)));
  if (bad) return `"${bad.name}" isn't a file type we can open. Send PNG, JPG, PDF, AI, EPS, SVG or ZIP.`;
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > ARTWORK_MAX_TOTAL_BYTES) {
    return `Files add up to ${formatBytes(total)}; the limit is ${formatBytes(ARTWORK_MAX_TOTAL_BYTES)}. Email larger files to us after you submit.`;
  }
  return null;
}

export type QuoteFields = {
  name: string;
  role: string;
  email: string;
  phone: string;
  org: string;
  garments: string[];
  /** Free text shown when the "Other" garment chip is selected */
  garmentsOther: string;
  sport: string;
  /** Free text shown when the sport select is "Other / multiple" */
  sportOther: string;
  quantity: string;
  neededBy: string;
  notes: string;
};

export type ContactFields = {
  name: string;
  org: string;
  email: string;
  phone: string;
  message: string;
};

function tooLong(errors: Record<string, string>, key: keyof typeof LIMITS, value: string) {
  if (value.length > LIMITS[key]) {
    errors[key] = `Please keep this under ${LIMITS[key]} characters.`;
  }
}

export function validateQuote(f: QuoteFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Please tell us your name.';
  if (!isEmail(f.email)) errors.email = 'Please enter a valid email address.';
  if (!f.org.trim()) errors.org = 'Please tell us the club, school or group.';
  if (f.garments.length === 0) errors.garments = 'Pick at least one garment.';
  if (f.garments.includes(GARMENT_OTHER) && f.garmentsOther.trim().length < 2) {
    errors.garmentsOther = 'Tell us what else you need.';
  }
  if (!f.sport.trim()) errors.sport = 'Please choose a sport or group type.';
  if (f.sport === SPORT_OTHER && f.sportOther.trim().length < 2) {
    errors.sportOther = 'Tell us the sport or group type.';
  }
  if (!f.quantity.trim()) errors.quantity = 'Please tell us roughly how many you need.';
  for (const key of [
    'name',
    'role',
    'phone',
    'org',
    'garmentsOther',
    'sport',
    'sportOther',
    'quantity',
    'neededBy',
    'notes',
  ] as const) {
    if (!errors[key]) tooLong(errors, key, f[key]);
  }
  return errors;
}

export function validateContact(f: ContactFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = 'Please tell us your name.';
  if (!isEmail(f.email)) errors.email = 'Please enter a valid email address.';
  if (f.message.trim().length < 10) errors.message = 'Please tell us a little more about how we can help.';
  for (const key of ['name', 'org', 'phone', 'message'] as const) {
    if (!errors[key]) tooLong(errors, key, f[key]);
  }
  return errors;
}
