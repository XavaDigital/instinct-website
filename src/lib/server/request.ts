import { TURNSTILE_SECRET_KEY } from 'astro:env/server';

/** Hard ceiling on any single text field, before per-field validation. */
const HARD_CAP = 20_000;

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** True when the client is a browser form post rather than a fetch() call. */
export function wantsHtml(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') && !accept.includes('application/json');
}

export function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
}

/**
 * Rejects bodies larger than `max` bytes before they are parsed. Browsers
 * always send Content-Length with multipart/form-data; a missing header is
 * treated as oversized.
 */
export function bodyTooLarge(request: Request, max: number): boolean {
  const raw = request.headers.get('content-length');
  if (raw === null) return true;
  const len = Number(raw);
  return !Number.isFinite(len) || len < 0 || len > max;
}

// Keep these as escape sequences (never literal control characters): they
// strip CR/LF and other controls so form values can't inject email headers.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]+/g;
// Same, but keeps LF (CR is normalised to LF first) for multi-line fields.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_KEEP_NEWLINE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/**
 * Reads a text field. Single-line fields have control characters (including
 * CR/LF) collapsed to spaces so they can never inject email headers; multiline
 * fields keep newlines. Values are trimmed but NOT truncated here — the
 * validators report over-length input instead of silently cutting it.
 */
export function field(form: FormData, key: string, opts: { multiline?: boolean } = {}): string {
  const value = form.get(key);
  if (typeof value !== 'string') return '';
  const cleaned = opts.multiline
    ? value.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS_KEEP_NEWLINE, '')
    : value.replace(CONTROL_CHARS, ' ').replace(/ {2,}/g, ' ');
  return cleaned.trim().slice(0, HARD_CAP);
}

export function fieldList(form: FormData, key: string, max: number, maxItems = 20): string[] {
  return form
    .getAll(key)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.replace(CONTROL_CHARS, ' ').trim().slice(0, max))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function files(form: FormData, key: string): File[] {
  return form.getAll(key).filter((v): v is File => v instanceof File && v.size > 0 && Boolean(v.name));
}

/**
 * Cheap bot checks: a honeypot field that humans never fill, and a timing
 * token that must be present and at least a few seconds old.
 */
export function looksLikeBot(form: FormData): boolean {
  const honeypot = form.get('website');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return true;
  const ts = Number(form.get('ts'));
  if (!Number.isFinite(ts) || ts <= 0) return true;
  if (Date.now() - ts < 2500) return true;
  return false;
}

/**
 * Verifies a Cloudflare Turnstile token. Returns true when Turnstile is not
 * configured so the forms keep working without it (honeypot, timing and rate
 * limiting still apply).
 */
export async function verifyTurnstile(form: FormData, ip?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true;
  const token = form.get('cf-turnstile-response');
  if (typeof token !== 'string' || !token) return false;
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'referrer',
  'landing',
  'at',
] as const;

/**
 * Campaign attribution captured in the browser (see BaseLayout) and posted as
 * a JSON string in the `attribution` field. Returns email rows, or [] when
 * absent or malformed.
 */
export function attributionRows(form: FormData): [string, string][] {
  const raw = form.get('attribution');
  if (typeof raw !== 'string' || !raw || raw.length > 4000) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const rec = parsed as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ATTRIBUTION_KEYS) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim()) {
      parts.push(`${key}=${value.replace(CONTROL_CHARS, ' ').trim().slice(0, 200)}`);
    }
  }
  return parts.length ? [['Source', parts.join('\n')]] : [];
}

export function clientIp(request: Request, fallback?: string): string | undefined {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    fallback
  );
}
