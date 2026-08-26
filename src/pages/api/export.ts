/**
 * Private export of the submissions log (see src/lib/server/store.ts).
 *
 *   /api/export?key=<EXPORT_KEY>                 table view in the browser
 *   /api/export?key=<EXPORT_KEY>&format=csv      CSV download (Excel / Google Sheets)
 *   /api/export?key=<EXPORT_KEY>&format=json     JSON
 *   ...&type=quote|contact   ...&since=YYYY-MM-DD (NZ date)   ...&limit=N (max 10000)
 *
 * Scripts can send the key as `Authorization: Bearer <EXPORT_KEY>` instead.
 * Opening the table view with ?key= sets a session cookie and redirects to the
 * same URL without the key, so the key is not repeated in links, history or
 * request logs; the cookie is an HMAC of the key, so rotating EXPORT_KEY
 * (`wrangler secret put EXPORT_KEY`) signs every browser out. Without an
 * EXPORT_KEY secret the route is a 404.
 */
import type { APIRoute } from 'astro';
import { EXPORT_KEY } from 'astro:env/server';
import { getDb } from '@/lib/server/bindings';
import { escapeHtml } from '@/lib/server/mailgun';
import { json } from '@/lib/server/request';
import { flattenSource, listSubmissions, nzTime, toCsv, type SubmissionRow, type SubmissionType } from '@/lib/server/store';

export const prerender = false;

const PRIVATE_HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
const COOKIE = 'instinct_export';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const enc = new TextEncoder();

/** Byte-wise comparison of two SHA-256 digests: a wrong value learns nothing from timing. */
async function sameSecret(a: string, b: string): Promise<boolean> {
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
async function sessionToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('instinct-export-session-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
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

/** Percent-encodes the characters that would let an address smuggle mailto header fields. */
function mailtoHref(email: string): string {
  return `mailto:${email.replace(/[?&#%=]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

function renderHtml(rows: SubmissionRow[], url: URL, type: SubmissionType | undefined): string {
  const link = (params: Record<string, string | null>) => {
    const u = new URL(url);
    u.searchParams.delete('key');
    for (const [k, v] of Object.entries(params)) {
      if (v === null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    return escapeHtml(u.pathname + u.search);
  };
  const cell = (v: unknown) => escapeHtml(String(v ?? ''));
  const body = rows
    .map(
      (r) => `<tr>
  <td>${cell(r.id)}</td>
  <td class="nowrap">${cell(nzTime(r.received_at))}</td>
  <td>${cell(r.type)}</td>
  <td><strong>${cell(r.name)}</strong>${r.role ? `<br><small>${cell(r.role)}</small>` : ''}</td>
  <td><a href="${escapeHtml(mailtoHref(String(r.email)))}">${cell(r.email)}</a>${r.phone ? `<br>${cell(r.phone)}` : ''}</td>
  <td>${cell(r.org)}</td>
  <td>${cell(r.sport)}</td>
  <td>${cell(r.garments)}</td>
  <td>${cell(r.quantity)}</td>
  <td>${cell(r.needed_by)}</td>
  <td class="msg">${cell(r.message)}</td>
  <td class="files">${cell(r.artwork)}</td>
  <td class="src">${cell(flattenSource(r.source))}</td>
  <td class="${r.email_status === 'sent' ? 'ok' : 'bad'}">${cell(r.email_status)}${r.email_error ? `<br><small>${cell(r.email_error)}</small>` : ''}</td>
</tr>`,
    )
    .join('\n');
  const tab = (label: string, value: string | null) =>
    `<a href="${link({ type: value })}"${(type ?? null) === value ? ' class="on"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Submissions — Instinct Apparel</title>
<style>
  body { margin: 0; padding: 20px; background: #1c0d3c; color: #fff; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p { margin: 0 0 14px; color: rgba(255,255,255,.7); }
  nav a { display: inline-block; margin: 0 10px 12px 0; padding: 8px 14px; border: 1px solid rgba(255,255,255,.25); color: #fff; text-decoration: none; }
  nav a.on, nav a:hover { border-color: #b6ff3b; color: #b6ff3b; }
  .wrap { overflow: auto; border: 1px solid rgba(255,255,255,.15); }
  table { border-collapse: collapse; min-width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.12); }
  th { background: #2a1458; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; position: sticky; top: 0; }
  td { max-width: 260px; overflow-wrap: anywhere; }
  td.msg { min-width: 260px; max-width: 480px; white-space: pre-wrap; }
  td.files, td.src { font-size: 12px; color: rgba(255,255,255,.7); word-break: break-all; }
  td.nowrap { white-space: nowrap; }
  td.ok { color: #b6ff3b; } td.bad { color: #ff8a8a; }
  a { color: #b6ff3b; }
  small { color: rgba(255,255,255,.6); }
</style>
</head>
<body>
<h1>Submissions</h1>
<p>${rows.length} ${type ?? 'submission'}${rows.length === 1 ? '' : 's'}, newest first. Times are New Zealand time.</p>
<nav>
  ${tab('All', null)} ${tab('Quotes', 'quote')} ${tab('Contacts', 'contact')}
  <a href="${link({ format: 'csv' })}">Download CSV</a>
  <a href="${link({ format: 'json' })}">JSON</a>
</nav>
<div class="wrap">
<table>
<thead><tr><th>ID</th><th>Received</th><th>Type</th><th>Name</th><th>Contact</th><th>Club / school / group</th><th>Sport</th><th>Garments</th><th>Quantity</th><th>Needed by</th><th>Message / notes</th><th>Artwork</th><th>Source</th><th>Email</th></tr></thead>
<tbody>
${body || '<tr><td colspan="14">No submissions yet.</td></tr>'}
</tbody>
</table>
</div>
</body>
</html>
`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!EXPORT_KEY) return json({ ok: false, error: 'Not found' }, 404, PRIVATE_HEADERS);
  const secret = EXPORT_KEY;

  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'html';

  // 1. Key in the query string or a Bearer header.
  let viaKey = false;
  let viaQuery = false;
  for (const candidate of queryKeys(url)) {
    if (await sameSecret(candidate, secret)) {
      viaKey = true;
      viaQuery = true;
      break;
    }
  }
  if (!viaKey) {
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (bearer && bearer.length <= 512 && (await sameSecret(bearer, secret))) viaKey = true;
  }
  // 2. Otherwise the session cookie set by an earlier ?key= visit.
  if (!viaKey) {
    const cookie = cookieValue(request);
    if (!cookie || cookie.length > 128 || !(await sameSecret(cookie, await sessionToken(secret)))) {
      return json({ ok: false, error: 'Unauthorised' }, 401, PRIVATE_HEADERS);
    }
  }

  // Browser view with the key in the URL: remember the session, drop the key from the address bar.
  if (viaQuery && format === 'html') {
    const clean = new URL(url);
    clean.searchParams.delete('key');
    return new Response(null, {
      status: 303,
      headers: {
        ...PRIVATE_HEADERS,
        location: clean.pathname + clean.search,
        'set-cookie': `${COOKIE}=${await sessionToken(secret)}; Path=/api/export; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`,
      },
    });
  }

  const db = getDb();
  if (!db) return json({ ok: false, error: 'Submissions database is not connected' }, 503, PRIVATE_HEADERS);

  const typeParam = url.searchParams.get('type');
  const type: SubmissionType | undefined = typeParam === 'quote' || typeParam === 'contact' ? typeParam : undefined;
  const sinceParam = url.searchParams.get('since') ?? '';
  const since = /^\d{4}-\d{2}-\d{2}$/.test(sinceParam) ? sinceParam : undefined;
  const limit = Number(url.searchParams.get('limit')) || undefined;

  let rows: SubmissionRow[];
  try {
    rows = await listSubmissions(db, { type, since, limit });
  } catch (err) {
    console.error('[export] query failed:', (err as Error).message);
    return json({ ok: false, error: 'Could not read submissions' }, 500, PRIVATE_HEADERS);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'json') return json({ ok: true, count: rows.length, rows }, 200, PRIVATE_HEADERS);
  if (format === 'csv') {
    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="instinct-submissions-${stamp}.csv"`,
      },
    });
  }
  return new Response(renderHtml(rows, url, type), {
    status: 200,
    headers: { ...PRIVATE_HEADERS, 'content-type': 'text/html; charset=utf-8' },
  });
};

export const POST: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405, { allow: 'GET' });
