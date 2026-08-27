/**
 * Stored copies of the artwork uploaded with quote requests, kept in the
 * ARTWORK KV namespace (wrangler.jsonc) so staff can download them from the
 * submissions export. Each object expires after the retention period; the
 * originals still travel as email attachments, so storage here is best-effort.
 */

// Structural types for the KV binding, so no Cloudflare type package is needed.
export interface KVLike {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { expirationTtl?: number; metadata?: Record<string, unknown> },
  ): Promise<void>;
  getWithMetadata(
    key: string,
    options: { type: 'stream' },
  ): Promise<{ value: ReadableStream | null; metadata: Record<string, unknown> | null }>;
}

/** One stored file, as recorded in the submissions row (`files` column, JSON array). */
export interface StoredFile {
  key: string;
  name: string;
  size: number;
  type: string;
}

/** Matches the privacy policy's 12-month retention (and the D1 purge). */
export const ARTWORK_TTL_SECONDS = 365 * 24 * 60 * 60;

/** Assigns a random key to each upload; `names` are the cleaned display names. */
export function planFiles(files: File[], names: string[]): StoredFile[] {
  return files.map((f, i) => ({
    key: crypto.randomUUID(),
    name: names[i] ?? f.name,
    size: f.size,
    type: (f.type || 'application/octet-stream').slice(0, 100),
  }));
}

/** Uploads each file; returns the ones that were stored. Failures are logged, never thrown. */
export async function storeArtwork(kv: KVLike | undefined, plan: StoredFile[], files: File[]): Promise<StoredFile[]> {
  if (!kv) {
    if (plan.length) console.warn('[artwork] no ARTWORK binding; files not stored');
    return [];
  }
  const stored: StoredFile[] = [];
  for (const [i, meta] of plan.entries()) {
    const file = files[i];
    if (!file) continue;
    try {
      // The display name lives in the submissions row; metadata stays ASCII and small.
      await kv.put(meta.key, await file.arrayBuffer(), {
        expirationTtl: ARTWORK_TTL_SECONDS,
        metadata: { size: meta.size, type: meta.type },
      });
      stored.push(meta);
    } catch (err) {
      console.error('[artwork] store failed:', meta.name, (err as Error).message);
    }
  }
  return stored;
}

/** Parses the `files` column; [] when empty or malformed. */
export function parseFiles(raw: string | number | null | undefined): StoredFile[] {
  const text = String(raw ?? '');
  if (!text) return [];
  try {
    const list = JSON.parse(text) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter(
      (f): f is StoredFile =>
        !!f && typeof f === 'object' && typeof (f as StoredFile).key === 'string' && typeof (f as StoredFile).name === 'string',
    );
  } catch {
    return [];
  }
}

/** Download route for the n-th stored file of a submission (protected like the export). */
export function fileUrl(rowId: string | number, index: number): string {
  return `/api/export/file?id=${encodeURIComponent(String(rowId))}&n=${index}`;
}

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
