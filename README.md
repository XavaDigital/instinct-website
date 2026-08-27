# Instinct Apparel — website

Customer-facing site for Instinct Apparel (custom sublimated teamwear, Christchurch, NZ).
Built with [Astro](https://astro.build) and React islands, styled with Tailwind CSS v4,
deployed to Cloudflare Workers. Every page is prerendered to static HTML; only the two
form endpoints and the private submissions export (and its artwork downloads) run on the server.

## Quick start

```bash
npm install
cp .env.example .env        # fill in the Mailgun and Turnstile keys to test the forms locally
npm run dev                 # http://localhost:4321 (first start takes ~40s while Vite optimises dependencies)
```

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload (runs in Cloudflare's workerd locally)    |
| `npm run build`         | Production build into `dist/`                                       |
| `npm run preview`       | Serve the production build locally                                  |
| `npm run check`         | Type-check `.astro` and `.tsx` files                                |
| `npm run deploy`        | Build the full site and deploy to Cloudflare with Wrangler          |
| `npm run deploy:mvp`    | Build the MVP (ad-landing subset) and deploy it                     |
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

| Command | Builds |
| ------- | ------ |
| `npm run build` | Everything — 36 pages (including 404) |
| `npm run build:mvp` | 19 pages (including 404): Home, Teamwear (as a showcase, no garment pages), Gallery, Why us, FAQ, Contact, Request a quote, the two thanks pages, policies (hub + 6), terms, size charts |

Because the MVP build receives real ad traffic, it hides unbacked social proof: testimonials
flagged `placeholder: true`, the placeholder client-logo row, and the "5.0 Google" rating
(shown again once `site.googleReviewsUrl` is set in `src/config/site.ts`). Replace the
placeholders in `src/content/testimonials.json` with real quotes to bring the sections back.
The other headline numbers in `site.stats` (years, clubs, turnaround) are shown in both modes —
confirm them before launch.

`npm run build:mvp` runs `astro build --mode mvp`; the mode reaches the code as
`import.meta.env.MODE` (`src/config/mode.ts`), which is the one switch the `.env` file cannot
override (the Cloudflare toolchain copies `.env` over the shell environment during a build).
`SITE_MODE=mvp` in `.env` or the shell also opts a plain `npm run build` into the MVP, but
nothing can turn a `--mode mvp` build back into the full site. For the ad-testing period
deploy `npm run build:mvp`; switch to `npm run build` when you want the whole site — no
branches, no merges. `build:mvp` fails if its output is not the MVP, so a wrong mode can't be
deployed by accident. Hidden pages are not built, are absent from the sitemap, and every link
to them is removed or rendered as plain text.

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
  URLs as the conversion goals. Tags are managed in **Google Tag Manager**: the container in
  `PUBLIC_GTM_ID` (default `GTM-MSQCHHBT`, set in `astro.config.mjs`) is rendered on every page
  of a production build (never by `astro dev`),
  and the thanks page pushes `{ event: 'generate_lead', form_type: 'quote' | 'contact',
  transaction_id }` to the `dataLayer`. In GTM, add a **Custom Event** trigger named
  `generate_lead` and attach the GA4 event tag and the Google Ads conversion tag to it (map
  `transaction_id` to the conversion's transaction ID to deduplicate). Without GTM, the direct
  path still works: set `PUBLIC_GA_MEASUREMENT_ID` and/or `PUBLIC_GADS_CONVERSION_ID` +
  `PUBLIC_GADS_CONVERSION_LABEL` and the page calls `gtag` itself. The direct path is switched
  off automatically while GTM is on, so a lead is never counted twice; to drop GTM, remove the
  `PUBLIC_GTM_ID` default in `astro.config.mjs` (a blank value in `.env` is replaced by the
  default). Events fire once per submission only: the API appends a one-shot `?sent=1` marker,
  the page strips it immediately, so reloads, bookmarks and bot submissions never count.
- UTM parameters, `gclid`/`fbclid` and the first external referrer are remembered in the
  visitor's browser (`localStorage`) on any page and sent with the form as a "Source" line in
  the email, so you can see which ad produced each enquiry.

## Forms and email

The quote and contact forms are React islands (`src/components/islands/`) that POST to
`src/pages/api/quote.ts` and `src/pages/api/contact.ts`. The endpoints validate input,
run a honeypot + timing check, optionally verify a Cloudflare Turnstile token, and send
the submission through Mailgun. Artwork uploads (up to 5 files / 20MB) are attached to
the email, and a copy is kept for 12 months so it can be downloaded from the submissions
export (see **Submissions log**).

The forms also work without JavaScript: on success the endpoint redirects to `/thanks/quote`
or `/thanks/contact`; on failure it redirects back to `#error` and a CSS `:target` notice on
the page shows the message.

### Spam and abuse protection

Layers, from cheapest to strongest:

1. Honeypot field and a timing token (must be present and a few seconds old).
2. Body-size guard (quote: files + 512KB; contact: 64KB) before the body is parsed.
3. In-memory per-IP rate limit (5 submissions per 10 minutes per endpoint). On Cloudflare
   Workers this is per isolate, so treat it as burst protection only.
4. **Cloudflare Turnstile** — Cloudflare's free, invisible alternative to a CAPTCHA. The
   widget "Instinct forms" exists in the Cloudflare account (hostnames `instinct.nz`, the
   workers.dev preview URL, `localhost` and `127.0.0.1`; mode Managed). Its public site key
   is the default for `PUBLIC_TURNSTILE_SITE_KEY` in `astro.config.mjs`; the secret is set on
   the Worker (`TURNSTILE_SECRET_KEY`) and lives in `.env` for local runs. The server accepts
   a token only when siteverify reports success **and** the token was issued on the same
   hostname that received the post **and** carries the expected action (`quote` /
   `contact`), so a token minted on localhost or the preview URL can't be replayed against
   production. With the site key present but no secret, every submission is rejected and the
   reason is logged (the widget would show but nothing could verify it) — so the secret must be
   set wherever the site runs. To switch Turnstile off entirely, remove the site-key default in
   `astro.config.mjs` (a blank value in `.env` is replaced by the default); the forms then fall
   back to the layers above.
5. **Recommended in production:** add a Cloudflare WAF rate-limiting rule for
   `/api/*` (for example 10 requests per minute per IP) in the dashboard. This is the
   only layer that is global rather than per isolate.

### Environment variables / secrets

See `.env.example`. Locally, put them in `.env` (Astro reads it for builds and for the
form endpoints in `npm run dev`; a `.dev.vars` file, if present, would shadow it for the Worker
runtime, so keep just `.env`). In production:

```bash
npx wrangler secret put MAILGUN_API_KEY
npx wrangler secret put MAILGUN_DOMAIN
npx wrangler secret put FORM_TO_EMAIL
npx wrangler secret put FORM_FROM_EMAIL
npx wrangler secret put TURNSTILE_SECRET_KEY        # widget "Instinct forms"
npx wrangler secret put EXPORT_KEY                  # submissions export (URL-safe: openssl rand -hex 24)
```

Public values (`PUBLIC_GTM_ID`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_GA_MEASUREMENT_ID`,
`PUBLIC_CF_ANALYTICS_TOKEN`, ...) are baked in at build time: Astro reads them from `.env` or
the shell environment when `npm run build` runs. The GTM container ID and the Turnstile site
key are public, so they also have defaults in `astro.config.mjs` and every build gets them
without a `.env`. Each analytics snippet only renders when its ID is set.

## Submissions log

Every genuine quote request and contact message is written to a Cloudflare D1 database
(`instinct-apparel-leads`, binding `DB` in `wrangler.jsonc`) *before* the notification email is
sent, so a lead survives a mail outage; the email's outcome (`sent` / `failed` + reason) is stored
next to it. Bots caught by the honeypot, timing or Turnstile checks are not stored. Attached
artwork is copied to the `ARTWORK` KV namespace (12-month expiry, matching the D1 purge) and
linked from the export — the table, the CSV's "Artwork links" column and the JSON — via
`/api/export/file?id=…&n=…`, which uses the same login and always serves files as downloads.
The originals still travel as email attachments, so a storage hiccup never loses a file. KV's
free tier holds 1 GB; if artwork volume outgrows it, move `src/lib/server/artwork.ts` to R2.
Artwork links opened from a spreadsheet or an email work once the export table has been opened
in that browser (the session cookie is sent on ordinary link clicks); scripts use the Bearer header.

**Deleting someone's data on request:** find the rows, delete their stored files, then the rows —
`npx wrangler d1 execute instinct-apparel-leads --remote --command "SELECT id, files FROM submissions WHERE email = 'person@example.com'"`,
then for each key in `files`: `npx wrangler kv key delete --binding ARTWORK --remote <key>`, then
`... --command "DELETE FROM submissions WHERE email = 'person@example.com'"`. Keys start with the
row id, so `wrangler kv key list --binding ARTWORK --remote --prefix <id>-` finds a row's files too.

Viewing it — replace `KEY` with the `EXPORT_KEY` secret:

| URL | Gives |
| --- | --- |
| `https://instinct.nz/api/export?key=KEY` | Table in the browser, newest first, NZ time |
| `https://instinct.nz/api/export?key=KEY&format=csv` | CSV download for Excel / Google Sheets (File → Import) |
| `https://instinct.nz/api/export?key=KEY&format=json` | JSON |
| add `&type=quote` or `&type=contact`, `&since=2026-09-01` (a New Zealand date), `&limit=500` | Filters |

Opening the table view with `?key=` sets a 30-day cookie and redirects to the same page without
the key, so the key isn't repeated in the page's links, your browser history or the Worker's
request logs after that first visit; the CSV/JSON links on the page use the cookie. Scripts should
send the key as a header instead: `Authorization: Bearer KEY`. Rotating the key
(`npx wrangler secret put EXPORT_KEY`) signs every browser out — do that if anyone who could
read the Worker logs or the link leaves. Treat the link like a password: it exposes customer
contact details.

A Google Sheet can pull it live with `=IMPORTDATA("https://instinct.nz/api/export?key=KEY&format=csv")`
(refreshes about hourly; anyone who can open that sheet can read the key, so keep the sheet private).
In the CSV, a value that starts with `=`, `@`, or a `+`/`-` that isn't a plain number is shown with
a leading apostrophe — that is deliberate, so a visitor can never plant a spreadsheet formula.

Schema: `migrations/0001_submissions.sql`. Rows older than 12 months are deleted automatically on
each new submission, matching the privacy policy. Apply schema changes with
`npx wrangler d1 migrations apply instinct-apparel-leads --remote` **before** deploying code that
needs them (and `--local` once for `npm run dev`, which uses a separate local database; without
it the log is skipped with a warning and the forms still work). A `[store] insert failed` line in
the Worker logs, or a 500 from `/api/export`, means a migration hasn't been applied.

## Deploying

### Cloudflare (default)

```bash
npx wrangler d1 migrations apply instinct-apparel-leads --remote   # only when migrations/ changed
npm run deploy:mvp   # ad-landing subset (current)
npm run deploy       # full site
```

Secrets on the Worker (`wrangler secret put`) survive deploys; only the public build-time values
change with the build.

`wrangler.jsonc` holds the Worker config. Production is served on `instinct.nz` and
`www.instinct.nz` through Worker **routes** (the `routes` block) on top of the zone's existing
proxied DNS records, and the `instinct-apparel-website.xava.workers.dev` preview URL stays on
(`workers_dev: true`; set it to `false` once the domain is live if you want to retire the
preview hostname — it serves the same deployment, secrets included). Two one-off settings for the `instinct.nz` zone are made in the
Cloudflare dashboard: **SSL/TLS → Edge Certificates → Always Use HTTPS** (on) and **Rules →
Redirect Rules → template "Redirect from WWW to root"**, so `http://` and `www.` both land on
`https://instinct.nz`.

### Google Cloud Run (alternative)

```bash
npm install @astrojs/node
```

In `astro.config.mjs` replace the `adapter: cloudflare(...)` line with
`adapter: node({ mode: 'standalone' })` (and the import). Build a container that runs
`node dist/server/entry.mjs`; set the same environment variables on the service. Turnstile and
Mailgun are plain HTTPS calls. The only Cloudflare-specific code is `src/lib/server/bindings.ts`
(the D1 submissions log and the KV artwork store): point `getDb()` / `getArtworkStore()` at
other storage, or let them return `undefined` — the forms then skip the log and the stored
copies and still send email with the attachments, and `/api/export` / `/api/export/file`
answer 503.

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
  lib/server/        mailgun.ts, request.ts, store.ts, artwork.ts, export-auth.ts, bindings.ts
  pages/             One file per route; api/ holds the endpoints (quote, contact, export, export/file)
  styles/global.css  Tailwind theme tokens and component classes
migrations/          D1 schema for the submissions log
scripts/             generate-assets.mjs (OG image + favicons)
public/              Static files copied as-is
Instinct Apparel UI mockups/   Original Claude Design mockups (reference only)
```
