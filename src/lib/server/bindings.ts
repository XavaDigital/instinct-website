/**
 * The one place the code touches Cloudflare-specific bindings.
 *
 * On Cloudflare (production and `astro dev`) `cloudflare:workers` exposes the
 * bindings declared in wrangler.jsonc. On another host (for example Google
 * Cloud Run with @astrojs/node) replace this file's body with whatever that
 * platform offers — or leave getDb() returning undefined: the forms then skip
 * the submissions log with a warning and still send the email, and
 * /api/export answers 503.
 */
import { env } from 'cloudflare:workers';
import type { D1Like } from './store';

/** The submissions database, or undefined when no binding is available. */
export function getDb(): D1Like | undefined {
  return env.DB;
}
