/**
 * Authentication shared by the submissions export (/api/export) and the
 * artwork download route (/api/export/file).
 *
 * Accepted: `?key=<EXPORT_KEY>` (decoded or raw, so a "+" survives), an
 * `Authorization: Bearer <EXPORT_KEY>` header, or the session cookie that the
 * export page sets after a `?key=` visit. The cookie is an HMAC of the key, so
 * rotating EXPORT_KEY signs every browser out. With no EXPORT_KEY configured
 * the routes answer 404.
 */
import { EXPORT_KEY } from 'astro:env/server';
import { json } from './request';

export const PRIVATE_HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
export const COOKIE = 'instinct_export';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const enc = new TextEncoder();

/** Byte-wise comparison of two SHA-256 digests: a wrong value learns nothing from timing. */
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const p = new Uint8Array(x);
  const q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}

/** Session cookie value: HMAC-SHA256 over a fixed label, keyed with EXPORT_KEY. */
export async function sessionToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('instinct-export-session-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** `Set-Cookie` value for a freshly authenticated browser session. */
export async function sessionCookie(secret: string): Promise<string> {
  return `${COOKIE}=${await sessionToken(secret)}; Path=/api/export; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

/** Candidate keys from the query string: decoded, and raw (a "+" in the key must survive). */
function queryKeys(url: URL): string[] {
  const out: string[] = [];
  const decoded = url.searchParams.get('key');
  if (decoded) out.push(decoded);
  const raw = /[?&]key=([^&#]*)/.exec(url.search)?.[1];
  if (raw && raw !== decoded) {
    out.push(raw);
    try {
      const pct = decodeURIComponent(raw);
      if (pct !== raw && pct !== decoded) out.push(pct);
    } catch {
      // not percent-encoded
    }
  }
  return out.filter((k) => k.length <= 512);
}

function cookieValue(request: Request): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=');
  }
  return null;
}

export type ExportAuth =
  | { ok: true; secret: string; viaQuery: boolean }
  | { ok: false; response: Response };

/** Checks the request; on failure returns the response to send (404 or 401). */
export async function authorise(request: Request, url: URL): Promise<ExportAuth> {
  if (!EXPORT_KEY) return { ok: false, response: json({ ok: false, error: 'Not found' }, 404, PRIVATE_HEADERS) };
  const secret = EXPORT_KEY;

  for (const candidate of queryKeys(url)) {
    if (await sameSecret(candidate, secret)) return { ok: true, secret, viaQuery: true };
  }
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (bearer && bearer.length <= 512 && (await sameSecret(bearer, secret))) return { ok: true, secret, viaQuery: false };

  const cookie = cookieValue(request);
  if (cookie && cookie.length <= 128 && (await sameSecret(cookie, await sessionToken(secret)))) {
    return { ok: true, secret, viaQuery: false };
  }
  return { ok: false, response: json({ ok: false, error: 'Unauthorised' }, 401, PRIVATE_HEADERS) };
}
