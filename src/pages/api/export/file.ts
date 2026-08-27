/**
 * Download of one stored artwork file: /api/export/file?id=<submission id>&n=<index>.
 * Same login as /api/export (key, Bearer, or the session cookie). Every file is
 * sent as an attachment with a generic content type, so nothing a visitor
 * uploaded (an SVG, an HTML-looking file) can ever run in the browser on this
 * origin.
 */
import type { APIRoute } from 'astro';
import { getArtworkStore, getDb } from '@/lib/server/bindings';
import { parseFiles } from '@/lib/server/artwork';
import { PRIVATE_HEADERS, authorise } from '@/lib/server/export-auth';
import { json } from '@/lib/server/request';

export const prerender = false;

/** RFC 6266 filename headers: an ASCII fallback plus the UTF-8 form. */
function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 150) || 'file';
  const utf8 = encodeURIComponent(name.slice(0, 150)).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const auth = await authorise(request, url);
  if (!auth.ok) return auth.response;

  const id = Number(url.searchParams.get('id'));
  const n = Number(url.searchParams.get('n'));
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(n) || n < 0 || n > 20) {
    return json({ ok: false, error: 'Bad request' }, 400, PRIVATE_HEADERS);
  }

  const db = getDb();
  const kv = getArtworkStore();
  if (!db || !kv) return json({ ok: false, error: 'File storage is not connected' }, 503, PRIVATE_HEADERS);

  let files;
  try {
    const { results } = await db.prepare('SELECT files FROM submissions WHERE id = ?').bind(id).all<{ files: string }>();
    files = parseFiles(results[0]?.files);
  } catch (err) {
    console.error('[export/file] query failed:', (err as Error).message);
    return json({ ok: false, error: 'Could not read submission' }, 500, PRIVATE_HEADERS);
  }
  const file = files[n];
  if (!file) return json({ ok: false, error: 'Not found' }, 404, PRIVATE_HEADERS);

  const { value, metadata } = await kv.getWithMetadata(file.key, { type: 'stream' });
  if (!value) return json({ ok: false, error: 'File no longer stored (files are kept for 12 months)' }, 404, PRIVATE_HEADERS);

  const size = Number((metadata as { size?: unknown } | null)?.size ?? file.size);
  const headers: Record<string, string> = {
    ...PRIVATE_HEADERS,
    'content-type': 'application/octet-stream',
    'content-disposition': contentDisposition(file.name),
    'x-content-type-options': 'nosniff',
  };
  if (Number.isFinite(size) && size > 0) headers['content-length'] = String(size);
  return new Response(value, { status: 200, headers });
};

export const POST: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405, { allow: 'GET' });
