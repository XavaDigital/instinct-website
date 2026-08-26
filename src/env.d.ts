/// <reference types="astro/client" />

// Worker bindings (wrangler.jsonc) are read with `import { env } from 'cloudflare:workers'`
// in src/lib/server/bindings.ts only; their shape is typed in src/lib/server/store.ts. If `wrangler types`
// is ever adopted (it generates worker-configuration.d.ts with its own declaration of this
// module), delete this block to avoid a duplicate declaration.
declare module 'cloudflare:workers' {
  export const env: import('./lib/server/store').Env;
}
