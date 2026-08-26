# Instinct Apparel — website

Customer-facing site for Instinct Apparel (custom sublimated teamwear, Christchurch, NZ).
Built with [Astro](https://astro.build) and React islands, styled with Tailwind CSS v4,
deployed to Cloudflare Workers. Every page is prerendered to static HTML; only the two
form endpoints run on the server.

## Quick start

```bash
npm install
cp .env.example .dev.vars   # fill in Mailgun keys to test the forms locally
npm run dev                 # http://localhost:4321
```

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload (runs in Cloudflare's workerd locally)    |
| `npm run build`         | Production build into `dist/`                                       |
| `npm run preview`       | Serve the production build locally                                  |
| `npm run check`         | Type-check `.astro` and `.tsx` files                                |
| `npm run deploy`        | Build and deploy to Cloudflare with Wrangler                        |
| `node scripts/generate-assets.mjs` | Regenerate `og-default.png` and the favicon PNGs         |

Requires Node 22.12 or newer.

## Editing content

All copy lives in `src/content/` as Markdown and JSON, validated against the schemas in
`src/content.config.ts`. Adding a file adds a page; no code changes needed.

| Folder / file                     | Drives                                                   |
| --------------------------------- | -------------------------------------------------------- |
| `src/content/sports/*.md`         | `/sports/<file-name>` and the sport tiles everywhere     |
| `src/content/garments/*.md`       | `/teamwear/<file-name>` and the teamwear hub cards       |
| `src/content/faqs/*.json`         | `/faq` categories (also pulled into other pages by question text) |
| `src/content/policies/*.md`       | `/policies/<file-name>` and the policies hub             |
| `src/content/legal/terms.md`      | `/terms`                                                 |
| `src/content/size-charts/*.json`  | `/size-charts`                                           |
| `src/content/testimonials.json`   | Quote cards (the `context` field picks where each shows) |
| `src/content/projects.json`       | Gallery and "recent projects" grids                      |
| `src/config/site.ts`              | Phone, email, address, hours, stats, navigation          |

Garments are made offshore: the site says "New Zealand owned and operated" and must never
claim "made in New Zealand" (first-person wording like "kit we've made" is fine).

Policies with `draft: true` in their frontmatter show a "draft wording" notice on the page.
Remove the flag once the wording has been reviewed. The terms page shows a placeholder
notice until the copy in `src/content/legal/terms.md` is replaced.

### Adding photos

Put images in `src/assets/` and reference them from content frontmatter, e.g.
`heroImage: ../../assets/netball-hero.jpg` in a sport file or `image: ../../assets/hoodie.jpg`
in a garment file. Astro optimises them at build time (AVIF/WebP, responsive sizes).
Until an image is set, the page shows the hatched placeholder from the mockup.

Gallery projects take `"image": "../assets/projects/riverside.jpg"` (relative to
`src/content/projects.json`).

## MVP mode (ad-landing subset)

The same codebase builds two sites, chosen at build time:

| `SITE_MODE` | Builds |
| ----------- | ------ |
| `full` (default) | Everything — 36 pages (including 404) |
| `mvp` | 19 pages (including 404): Home, Teamwear (as a showcase, no garment pages), Gallery, Why us, FAQ, Contact, Request a quote, the two thanks pages, policies (hub + 6), terms, size charts |

Because the MVP build receives real ad traffic, it hides unbacked social proof: testimonials
flagged `placeholder: true`, the placeholder client-logo row, and the "5.0 Google" rating
(shown again once `site.googleReviewsUrl` is set in `src/config/site.ts`). Replace the
placeholders in `src/content/testimonials.json` with real quotes to bring the sections back.
The other headline numbers in `site.stats` (years, clubs, turnaround) are shown in both modes —
confirm them before launch.

`npm run build:mvp` builds the MVP; `npm run build` builds the full site. In the Cloudflare
build settings set `SITE_MODE=mvp` for the ad-testing period and change it to `full` when you
want the whole site — no branches, no merges. Hidden pages are not built, are absent from the
sitemap, and every link to them is removed or rendered as plain text (`src/config/mode.ts`).

### Photos and images

**See [IMAGE-GUIDE.md](IMAGE-GUIDE.md)** — the complete brief for whoever supplies photos:
which folder, which filename, what to shoot, what size. Every image slot on the site is
resolved by filename (`src/lib/images.ts`), so correctly named files appear with no edits.

Gallery summary: drop photos (jpg, jpeg, png, webp, avif; any case) into `src/assets/gallery/`. The filename
becomes the caption and, if it starts with a sport id (`rugby-`, `netball-`, `football-`,
`basketball-`, `touch-`, `cultural-groups-`), the photo is grouped under that sport:

```
src/assets/gallery/netball-riverside-2026.jpg   →  "Riverside 2026" under Netball
src/assets/gallery/rugby-under-12.jpg           →  "Under 12" under Rugby
src/assets/gallery/01-rugby-final.jpg           →  "Rugby final" under Rugby (leading number = sort order)
src/assets/gallery/netball-2.jpg                →  "Netball kit" under Netball (a bare number isn't a caption)
src/assets/gallery/hoodies-lineup.jpg           →  "Hoodies lineup" under "More kit"
```

Photos sort in natural filename order and appear in the gallery, in the homepage "recent
projects" strip and on the matching sport page. A sport's placeholder tiles disappear as soon
as that sport has one real photo; other sports keep theirs until they get photos too. For a
custom caption or garment list, add an entry to `src/content/projects.json` instead.

Garment showcase images on `/teamwear` come from each garment file's `image` field
(`image: ../../assets/garments/hoodies.jpg`).

### Conversions and attribution

- Both forms land on `/thanks/quote` or `/thanks/contact` after a successful send — use those
  URLs as the conversion goals. The page fires a GA4 `generate_lead` event and, when
  `PUBLIC_GADS_CONVERSION_ID` + `PUBLIC_GADS_CONVERSION_LABEL` are set, a Google Ads
  `conversion` event. Events fire once per submission only: the API appends a one-shot
  `?sent=1` marker, the page strips it immediately, so reloads, bookmarks and bot submissions
  never count.
- UTM parameters, `gclid`/`fbclid` and the first external referrer are remembered in the
  visitor's browser (`localStorage`) on any page and sent with the form as a "Source" line in
  the email, so you can see which ad produced each enquiry.

## Forms and email

The quote and contact forms are React islands (`src/components/islands/`) that POST to
`src/pages/api/quote.ts` and `src/pages/api/contact.ts`. The endpoints validate input,
run a honeypot + timing check, optionally verify a Cloudflare Turnstile token, and send
the submission through Mailgun. Artwork uploads (up to 5 files / 20MB) are attached to
the email, so no file storage is needed.

The forms also work without JavaScript: on success the endpoint redirects to `/thanks/quote`
or `/thanks/contact`; on failure it redirects back to `#error` and a CSS `:target` notice on
the page shows the message.

### Spam and abuse protection

Layers, from cheapest to strongest:

1. Honeypot field and a timing token (must be present and a few seconds old).
2. Body-size guard (quote: files + 512KB; contact: 64KB) before the body is parsed.
3. In-memory per-IP rate limit (5 submissions per 10 minutes per endpoint). On Cloudflare
   Workers this is per isolate, so treat it as burst protection only.
4. **Cloudflare Turnstile** — set `TURNSTILE_SECRET_KEY` and `PUBLIC_TURNSTILE_SITE_KEY`
   (both, or neither). Strongly recommended before launch; without it the forms are
   protected only by the layers above.

   *What Turnstile is:* Cloudflare's free, invisible alternative to a CAPTCHA. It checks that
   a form is being sent by a real browser, usually without showing anything. *Getting the
   keys:* Cloudflare dashboard → **Turnstile** → **Add widget** → name it "Instinct forms",
   hostname `instinctapparel.co.nz` (add `localhost` for local testing), widget mode
   **Managed** → Create. It shows two strings: the **Site Key** goes in
   `PUBLIC_TURNSTILE_SITE_KEY` (it's public and is baked into the pages at build time) and
   the **Secret Key** goes in `TURNSTILE_SECRET_KEY` (`npx wrangler secret put
   TURNSTILE_SECRET_KEY`). Takes about two minutes and costs nothing.
5. **Recommended in production:** add a Cloudflare WAF rate-limiting rule for
   `/api/*` (for example 10 requests per minute per IP) in the dashboard. This is the
   only layer that is global rather than per isolate.

### Environment variables / secrets

See `.env.example`. Locally, put them in `.dev.vars`. In production:

```bash
npx wrangler secret put MAILGUN_API_KEY
npx wrangler secret put MAILGUN_DOMAIN
npx wrangler secret put FORM_TO_EMAIL
npx wrangler secret put FORM_FROM_EMAIL
npx wrangler secret put TURNSTILE_SECRET_KEY        # optional
```

Public values (`PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_GA_MEASUREMENT_ID`,
`PUBLIC_CF_ANALYTICS_TOKEN`) are baked in at build time, so set them in the build
environment (or `wrangler.jsonc` → `vars`) before running `npm run build`. Each analytics
snippet only renders when its ID is set.

## Deploying

### Cloudflare (default)

```bash
npm run deploy
```

`wrangler.jsonc` holds the Worker config. Attach the `instinctapparel.co.nz` custom domain
to the Worker in the Cloudflare dashboard (or add a `routes` block).

### Google Cloud Run (alternative)

```bash
npm install @astrojs/node
```

In `astro.config.mjs` replace the `adapter: cloudflare(...)` line with
`adapter: node({ mode: 'standalone' })` (and the import). Build a container that runs
`node dist/server/entry.mjs`; set the same environment variables on the service. Nothing
else in the project depends on Cloudflare — Turnstile and Mailgun are plain HTTPS calls.

## SEO checklist built in

- Static HTML for every page, one `<h1>`, descriptive titles and meta descriptions
- Canonical URLs without trailing slashes (`build.format: 'file'`)
- Open Graph / Twitter tags with a generated share image
- JSON-LD: LocalBusiness + WebSite on every page, BreadcrumbList on inner pages,
  FAQPage, Product (garments), Service (sports), HowTo (how it works)
- `sitemap-index.xml` and `robots.txt`
- Self-hosted fonts (`src/styles/fonts.css`, latin + latin-ext subsets only, woff2 only) with
  preload for the two above-the-fold faces
- The whole stylesheet is inlined into each page (`build.inlineStylesheets: 'always'`), so
  there is no render-blocking CSS request; pages are ~15–18KB gzipped including CSS
- Minimal client JavaScript: the mobile menu, the FAQ filter, the two form islands, a small
  inline attribution snippet, and (when configured) the analytics/conversion tags
- Lighthouse (local preview): desktop 99–100 across the board; mobile performance 90+

## Project layout

```
src/
  components/        Astro components (Header, Footer, Figure, CtaBand, Faq, ...)
  components/islands React components hydrated in the browser (forms)
  config/site.ts     Business details and navigation
  content/           Editable content (see above)
  layouts/           BaseLayout.astro — <head>, SEO, analytics, header/footer
  lib/               seo.ts (JSON-LD helpers), forms.ts (shared validation)
  lib/server/        mailgun.ts, request.ts (server-only helpers)
  pages/             One file per route; api/ holds the two endpoints
  styles/global.css  Tailwind theme tokens and component classes
scripts/             generate-assets.mjs (OG image + favicons)
public/              Static files copied as-is
Instinct Apparel UI mockups/   Original Claude Design mockups (reference only)
```
