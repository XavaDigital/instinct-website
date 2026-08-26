/**
 * Best-effort, in-memory rate limiter keyed by client IP.
 *
 * On Cloudflare Workers memory is per isolate (per data centre and short
 * lived), so this limits bursts rather than giving a global guarantee — pair
 * it with a Cloudflare WAF rate-limiting rule on /api/* for production (see
 * README). On the Node adapter it is a single process and works as expected.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimited(key: string, limit = 5, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return false;
}
