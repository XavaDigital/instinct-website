# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

Marketing / lead-generation website for Instinct Apparel (custom sublimated sports
teamwear, Christchurch NZ). Main conversion is the quote request form. Not e-commerce.

## Stack

- Astro 7 (static output, `build.format: 'file'`, no trailing slashes) with the
  Cloudflare adapter. Only `src/pages/api/*.ts` render on demand.
- React 19 islands for the two forms only. Everything else is zero-JS Astro; prefer
  `<details>`, plain `<script>` tags in `.astro` files, or CSS before adding an island.
- Tailwind CSS v4. Design tokens are defined in `src/styles/global.css` under `@theme`
  (`plum-*` purples, `lime`, `lilac`, fonts `display` / `sans` / `mono`). Reusable
  component classes (`btn`, `eyebrow`, `display`, `panel`, `field-*`, `faq`, ...) live
  in the same file. Use them rather than re-declaring the same utilities on each page.
- Content collections in `src/content/` with schemas in `src/content.config.ts`.
  Zod comes from `astro/zod`; `render()` from `astro:content`.
- Business details (phone, email, address, hours, nav) come from `src/config/site.ts`.
  Never hard-code them in pages.

## Site modes

`npm run build:mvp` (`astro build --mode mvp`) builds the ad-landing subset; `npm run build`
builds everything (`SITE_MODE=mvp` in the environment or .env also opts into the MVP).
`src/config/mode.ts` is the single source of truth: use `routeEnabled(href)` before linking
to /sports*, /teamwear/<garment> or /how-it-works, and `IS_MVP` for layout differences.
Hidden pages opt out via `getStaticPaths()` returning `[]`. Never fork the codebase for
the MVP — both sites must build from `main`.

## Conventions

- Every page uses `BaseLayout` and passes `title`, `description`, `breadcrumbs`
  (inner pages) and any page-specific `jsonLd` (helpers in `src/lib/seo.ts`).
- Images go through `src/components/Figure.astro`, which renders the hatched
  placeholder from the mockups until a real image is supplied.
- Astro 7's compiler rejects unclosed non-void tags; always close `<p>`, `<li>`, etc.
- The mockups in `Instinct Apparel UI mockups/` are the visual reference (direction 1a,
  dark purple + lime). Match their spacing and type scale when adding sections.
- Copy is written in NZ English (organiser, colour, centre).
- Garments are made offshore. Never write "made in New Zealand", "NZ made" or "made /
  sewn / sublimated in Christchurch". The approved claim is "New Zealand owned and
  operated" (the announcement bar, tagline and footer use it). First-person production
  voice is fine ("we make it", "kit we've made", "our production staff") — only the
  country-of-origin claim is off limits.
- "Your gear, your way" is the tagline of the owner's other brand (BeastMode); don't use
  it here. Instinct's lines are "Follow your instinct" and "Trust your instinct".
- Both form endpoints log the submission to D1 (`src/lib/server/store.ts`) before sending the
  email; keep that order, and keep the database writes best-effort (never fail the form).

## Commands

```bash
npm run dev       # local dev
npm run build     # must pass before committing
npm run check     # astro check (types)
npm run preview   # serve the build
```

## Secrets

Never commit `.dev.vars` or `.env`. Server secrets are declared in `astro.config.mjs`
(`env.schema`) and read via `astro:env/server`; client-safe values are `PUBLIC_*`.
