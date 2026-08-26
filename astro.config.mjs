// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

/**
 * Instinct Apparel — Astro configuration.
 *
 * Every page is prerendered to static HTML at build time. Only the two form
 * endpoints under src/pages/api/ opt out with `export const prerender = false`.
 *
 * Hosting: the Cloudflare adapter is the default. To deploy on Google Cloud Run
 * instead, install @astrojs/node and swap the adapter line for
 * `adapter: node({ mode: 'standalone' })` — nothing else in the project
 * depends on Cloudflare.
 */
export default defineConfig({
  site: 'https://instinctapparel.co.nz',
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Emit /about.html rather than /about/index.html so URLs never carry a
    // trailing slash on Cloudflare's asset server.
    format: 'file',
    // The whole stylesheet is small (fonts + Tailwind); inlining it removes
    // the one render-blocking request and improves mobile LCP.
    inlineStylesheets: 'always',
  },
  // Keep HTML-aware whitespace handling (Astro 7 defaults to JSX-style
  // stripping, which removes the space between adjacent inline elements).
  compressHTML: true,
  adapter: cloudflare({
    // Optimise images with sharp at build time; prerendered pages never need
    // the runtime Images binding.
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/api/') && !page.includes('/thanks') && !page.endsWith('/404'),
      changefreq: 'monthly',
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      // "mvp" builds the ad-landing subset (no sport pages, no individual
      // garment pages, no how-it-works); "full" builds everything.
      SITE_MODE: envField.enum({ context: 'server', access: 'public', values: ['full', 'mvp'], default: 'full' }),
      // Google Ads conversion (optional): "AW-123456789" and the conversion label
      PUBLIC_GADS_CONVERSION_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GADS_CONVERSION_LABEL: envField.string({ context: 'client', access: 'public', optional: true }),
      // Mailgun (transactional email for the quote and contact forms)
      MAILGUN_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      MAILGUN_DOMAIN: envField.string({ context: 'server', access: 'secret', optional: true }),
      MAILGUN_API_BASE: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'https://api.mailgun.net',
      }),
      FORM_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      FORM_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Cloudflare Turnstile (spam protection). Both optional: without keys the
      // forms fall back to honeypot + timing checks only.
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      // Analytics. Each snippet is only rendered when its ID is set.
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
