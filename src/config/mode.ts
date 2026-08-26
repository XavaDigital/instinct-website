import { SITE_MODE } from 'astro:env/server';

/**
 * Build mode. Set SITE_MODE=mvp (in .env or the build environment) to build
 * the ad-landing subset of the site; anything else builds the full site.
 *
 * MVP hides: /sports and every /sports/<sport>, every /teamwear/<garment>
 * (the /teamwear hub stays), and /how-it-works. Hidden routes are not built,
 * not in the sitemap, and every link to them is removed or turned into plain
 * text by `routeEnabled()`.
 */
export const MODE: 'full' | 'mvp' = SITE_MODE;
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
