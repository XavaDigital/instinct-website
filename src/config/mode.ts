/**
 * Build mode. `npm run build:mvp` (= `astro build --mode mvp`) builds the
 * ad-landing subset of the site; `npm run build` builds the full site, or
 * the MVP when SITE_MODE=mvp is present in the build environment or .env.
 *
 * The primary switch is Astro's --mode flag, inlined by Vite as
 * import.meta.env.MODE, because it is the one channel the .env file cannot
 * override: the Cloudflare toolchain loads .env into process.env with
 * override during the build, so a plain SITE_MODE=mvp from the shell was
 * silently replaced by SITE_MODE=full from .env and the full site got built.
 * SITE_MODE is still honoured as a way to opt IN to the MVP; it can never
 * switch a --mode mvp build back to full. Evaluated at build time only.
 *
 * MVP hides: /sports and every /sports/<sport>, every /teamwear/<garment>
 * (the /teamwear hub stays), and /how-it-works. Hidden routes are not built,
 * not in the sitemap, and every link to them is removed or turned into plain
 * text by `routeEnabled()`.
 */
const fromEnv = typeof process !== 'undefined' ? process.env?.SITE_MODE : undefined;
export const MODE: 'full' | 'mvp' = import.meta.env.MODE === 'mvp' || fromEnv === 'mvp' ? 'mvp' : 'full';
export const IS_MVP = MODE === 'mvp';

const HIDDEN_IN_MVP: { exact?: string; prefix?: string }[] = [
  { exact: '/sports', prefix: '/sports/' },
  { prefix: '/teamwear/' },
  { exact: '/how-it-works', prefix: '/how-it-works/' },
];

/** True when a path is built in the current mode (query/hash are ignored). */
export function routeEnabled(href: string): boolean {
  if (!IS_MVP) return true;
  const path = href.split(/[?#]/)[0] ?? href;
  return !HIDDEN_IN_MVP.some(
    (r) => (r.exact !== undefined && path === r.exact) || (r.prefix !== undefined && path.startsWith(r.prefix)),
  );
}

/** Keep only links whose target exists in the current mode. */
export function enabledLinks<T extends { href: string }>(links: readonly T[]): T[] {
  return links.filter((l) => routeEnabled(l.href));
}
