/**
 * Submissions log in Cloudflare D1 (binding `DB`; see wrangler.jsonc,
 * migrations/0001_submissions.sql and bindings.ts). Every genuine quote
 * request and contact message is written here *before* the email is sent, so
 * a lead survives a mail outage, and the email's outcome is stored next to it
 * afterwards. Rows older than the retention period promised in the privacy
 * policy are purged on each write.
 *
 * All writes are best-effort: a database problem is logged and the form still
 * completes. Reads are used by /api/export (private table / CSV / JSON).
 */

import { fileUrl, parseFiles, type KVLike, type StoredFile } from './artwork';

// Structural types for the D1 binding, so no Cloudflare type package is needed.
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
}
/** Worker bindings the site uses (read through bindings.ts; module declared in src/env.d.ts). */
export interface Env {
  DB?: D1Like;
  ARTWORK?: KVLike;
}

export type SubmissionType = 'quote' | 'contact';

export interface Submission {
  type: SubmissionType;
  name: string;
  role?: string;
  email: string;
  phone?: string;
  org?: string;
  sport?: string;
  garments?: string;
  quantity?: string;
  neededBy?: string;
  /** Quote notes or the contact message. */
  message: string;
  /** Attached filenames, already cleaned (always listed, even when a copy could not be stored). */
  artwork?: string[];
  /** Stored copies of the attachments (see artwork.ts); linked from the export. */
  files?: StoredFile[];
  /** Campaign attribution: utm_*, gclid, fbclid, referrer, landing, at. */
  source?: Record<string, string>;
  /** Hostname the form was posted on. */
  page: string;
}

export const COLUMNS = [
  'id',
  'received_at',
  'type',
  'name',
  'role',
  'email',
  'phone',
  'org',
  'sport',
  'garments',
  'quantity',
  'needed_by',
  'message',
  'artwork',
  'files',
  'source',
  'page',
  'email_status',
  'email_error',
] as const;
export type Column = (typeof COLUMNS)[number];
export type SubmissionRow = Record<Column, string | number>;

/** Matches the privacy policy: enquiries that don't become orders are deleted after 12 months. */
export const RETENTION_MONTHS = 12;

const INSERT_SQL = `INSERT INTO submissions
  (received_at, type, name, role, email, phone, org, sport, garments, quantity, needed_by, message, artwork, files, source, page)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Deletes rows past the retention period. Best-effort; uses the received_at index. */
export async function purgeExpired(db: D1Like, now = new Date()): Promise<void> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  try {
    await db.prepare('DELETE FROM submissions WHERE received_at < ?').bind(cutoff.toISOString()).run();
  } catch (err) {
    console.error('[store] purge failed:', (err as Error).message);
  }
}

/** Writes one submission. Returns the new row id, or null when nothing could be stored. */
export async function recordSubmission(db: D1Like | undefined, s: Submission): Promise<number | null> {
  if (!db) {
    console.warn('[store] no DB binding; submission not recorded');
    return null;
  }
  await purgeExpired(db);
  try {
    const result = await db
      .prepare(INSERT_SQL)
      .bind(
        new Date().toISOString(),
        s.type,
        s.name,
        s.role ?? '',
        s.email,
        s.phone ?? '',
        s.org ?? '',
        s.sport ?? '',
        s.garments ?? '',
        s.quantity ?? '',
        s.neededBy ?? '',
        s.message,
        (s.artwork ?? []).join(', '),
        s.files && s.files.length ? JSON.stringify(s.files) : '',
        s.source && Object.keys(s.source).length ? JSON.stringify(s.source) : '',
        s.page,
      )
      .run();
    const id = result.meta?.last_row_id;
    return typeof id === 'number' ? id : null;
  } catch (err) {
    console.error('[store] insert failed:', (err as Error).message);
    return null;
  }
}

/** Records the stored artwork copies against a row. Best-effort. */
export async function markFiles(db: D1Like | undefined, id: number | null, files: StoredFile[]): Promise<void> {
  if (!db || id === null || !files.length) return;
  try {
    await db.prepare('UPDATE submissions SET files = ? WHERE id = ?').bind(JSON.stringify(files), id).run();
  } catch (err) {
    console.error('[store] files update failed:', (err as Error).message);
  }
}

/** Records how the notification email went. Best-effort. */
export async function markEmail(
  db: D1Like | undefined,
  id: number | null,
  status: 'sent' | 'failed',
  error = '',
): Promise<void> {
  if (!db || id === null) return;
  try {
    await db
      .prepare('UPDATE submissions SET email_status = ?, email_error = ? WHERE id = ?')
      .bind(status, error.slice(0, 500), id)
      .run();
  } catch (err) {
    console.error('[store] update failed:', (err as Error).message);
  }
}

export interface ListOptions {
  type?: SubmissionType;
  /** New Zealand calendar date (YYYY-MM-DD); rows received from NZ midnight that day. */
  since?: string;
  limit?: number;
}

const MAX_ROWS = 10_000;

/** Newest first. Filters are bound parameters; the column list is fixed. */
export async function listSubmissions(db: D1Like, opts: ListOptions = {}): Promise<SubmissionRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.type) {
    where.push('type = ?');
    params.push(opts.type);
  }
  if (opts.since) {
    where.push('received_at >= ?');
    params.push(nzDateToUtc(opts.since));
  }
  const limit = Math.min(Math.max(Math.floor(opts.limit ?? 5000), 1), MAX_ROWS);
  const sql = `SELECT ${COLUMNS.join(', ')} FROM submissions${
    where.length ? ` WHERE ${where.join(' AND ')}` : ''
  } ORDER BY received_at DESC, id DESC LIMIT ${limit}`;
  const { results } = await db.prepare(sql).bind(...params).all<SubmissionRow>();
  return results;
}

// Built once: constructing a formatter per row is the expensive part of Intl.
const NZ_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const NZ_OFFSET_FORMAT = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', timeZoneName: 'longOffset' });

/** "27 Aug 2026, 3:04 pm" in New Zealand time; falls back to the raw value. */
export function nzTime(iso: string | number): string {
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return NZ_FORMAT.format(d);
}

/** Pacific/Auckland offset from UTC in minutes at a given instant (+720 or +780). */
function nzOffsetMinutes(at: Date): number {
  try {
    const name = NZ_OFFSET_FORMAT.formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? '';
    const m = /([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
    if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  } catch {
    // older ICU without longOffset
  }
  return 12 * 60;
}

/**
 * The UTC instant of midnight in New Zealand on a calendar date (YYYY-MM-DD),
 * as an ISO string comparable with `received_at`. Handles daylight saving.
 */
export function nzDateToUtc(date: string): string {
  const standardMidnight = new Date(`${date}T00:00:00+12:00`);
  const offset = nzOffsetMinutes(standardMidnight);
  return new Date(Date.parse(`${date}T00:00:00Z`) - offset * 60_000).toISOString();
}

/** JSON attribution → "utm_source=google; utm_campaign=winter" for people to read. */
export function flattenSource(raw: string | number): string {
  const text = String(raw ?? '');
  if (!text) return '';
  try {
    const rec = JSON.parse(text) as Record<string, unknown>;
    return Object.entries(rec)
      .filter(([, v]) => typeof v === 'string' && v)
      .map(([k, v]) => `${k}=${v as string}`)
      .join('; ');
  } catch {
    return text;
  }
}

export const CSV_HEADERS: [Column | 'received_nz' | 'file_links', string][] = [
  ['id', 'ID'],
  ['received_nz', 'Received (NZ time)'],
  ['received_at', 'Received (UTC)'],
  ['type', 'Type'],
  ['name', 'Name'],
  ['role', 'Role'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['org', 'Club / school / group'],
  ['sport', 'Sport'],
  ['garments', 'Garments'],
  ['quantity', 'Quantity'],
  ['needed_by', 'Needed by'],
  ['message', 'Message / notes'],
  ['artwork', 'Artwork files'],
  ['file_links', 'Artwork links'],
  ['source', 'Source'],
  ['page', 'Page'],
  ['email_status', 'Email status'],
  ['email_error', 'Email error'],
];

/**
 * One CSV cell. Quotes as needed and neutralises spreadsheet formula
 * injection: a cell starting with = @ tab or CR, or with + / - followed by
 * anything other than a plain number (so "+64 21 555 1234" stays a phone
 * number), is prefixed with an apostrophe. Excel and Sheets show that
 * apostrophe when importing a CSV; it is the price of never executing a
 * visitor-supplied formula.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  const formulaLike = /^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s().-]*$/.test(s));
  if (formulaLike) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * UTF-8 with BOM and CRLF line ends, so Excel opens it correctly by double-click.
 * `origin` (e.g. https://instinct.nz) makes the artwork links absolute.
 */
export function toCsv(rows: SubmissionRow[], origin = ''): string {
  const lines = [CSV_HEADERS.map(([, label]) => csvCell(label)).join(',')];
  for (const row of rows) {
    lines.push(
      CSV_HEADERS.map(([key]) => {
        if (key === 'received_nz') return csvCell(nzTime(row.received_at));
        if (key === 'source') return csvCell(flattenSource(row.source));
        if (key === 'files') return csvCell(parseFiles(row.files).map((f) => f.name).join(', '));
        if (key === 'file_links') return csvCell(parseFiles(row.files).map((_, i) => origin + fileUrl(row.id, i)).join(' '));
        return csvCell(row[key]);
      }).join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
