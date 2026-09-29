# Instinct Apparel website — image guide

This is the complete brief for supplying photos and images. Every image on the site is
picked up **by filename** from one of five folders. If a file has the right name in the right
folder, it appears on the site automatically — no code or content edits needed. If a slot has
no file yet, the site shows a labelled placeholder tile in its place, so nothing breaks while
photos arrive in batches.

Files go in these folders inside the project:

```
src/assets/gallery/    kit photos for the gallery (as many as you like)
src/assets/site/       one photo per fixed slot on the main pages (8 slots)
src/assets/sports/     one hero per sport, plus one feature photo per sport
src/assets/garments/   one main image per garment, plus optional extra views
src/assets/logos/      club / school logos we've worked with
```

If you can't add files to the project yourself, send them to David in a zip **with the
filenames already correct** — the names are the whole system.

**Finding the slots on the site.** Every empty slot shows its filename and recommended size
on the placeholder itself, e.g. `site/home-hero.jpg · 2400 × 1800`. Add `?slots` to any page
address (e.g. `https://instinct.nz/?slots`) to label every slot, filled or empty, with its
filename and the size it is showing at on your current screen. It stays on while you click
around; add `?slots=off` to turn it off.

---

## 1. Rules that apply to every file

| Rule | Detail |
| --- | --- |
| Filename characters | Lower-case letters, numbers and hyphens only: `netball-riverside-2026.jpg`. No spaces, apostrophes, macrons or capitals. Use hyphens, not underscores. |
| Format | Photos: **JPG** (quality 80–90). Logos: **PNG** with a transparent background, or **SVG**. WebP/AVIF/PNG photos also work. |
| Size | Longest edge **2400 px** (1600 px at the very least). Under **3 MB** per file. The build makes the smaller versions for phones itself, so never pre-shrink. |
| Colour | sRGB. No borders, no text overlays, no watermarks, no collages. |
| Content | Our kit only — no other brand's garments. We must own the photo or have permission to use it. No identifiable children without a parent's OK. |
| Shape | Every slot has a fixed shape (ratio), listed in each section, and keeps that shape on phone, tablet and desktop. A photo in the same ratio fills the slot exactly. A photo in a different ratio still fills it with no gaps, but its edges are cropped, so keep the subject centred with some room around it. |
| Tablets | No separate tablet images. On tablets the page photos stack under the text and show **wider than on desktop** (up to about 990 px on screen, so about 2000 px on a retina iPad). That is why 2400 px is the target. |

---

## 2. Gallery photos — `src/assets/gallery/`

Bulk photos of finished kit. They appear on **/gallery** (grouped by sport), in the
**"Kit we shipped lately"** strip on the homepage (the first four by filename), and — once the
full site is switched on — on each sport page and the relevant garment pages.

**Filename pattern:** `<sport>-<caption words>.jpg`

Start with one of the six sport ids so the photo lands in the right group:

| Sport id | Group heading |
| --- | --- |
| `rugby` | Rugby |
| `netball` | Netball |
| `football` | Football |
| `basketball` | Basketball |
| `touch` | Touch & Tag |
| `cultural-groups` | Kapa haka & culture |

Everything after the sport id becomes the caption (first letter capitalised, hyphens become
spaces). Examples:

| Filename | Caption shown | Group |
| --- | --- | --- |
| `netball-riverside-2026.jpg` | Riverside 2026 | Netball |
| `rugby-under-12.jpg` | Under 12 | Rugby |
| `rugby-final.jpg` | Rugby final | Rugby (a single word keeps the sport for context) |
| `netball-2.jpg` | Netball kit | Netball (a bare number is not a caption) |
| `01-rugby-final.jpg` | Rugby final | Rugby (a leading number is only a sort prefix) |
| `hoodies-lineup.jpg` | Hoodies lineup | More kit (no sport prefix) |

Ordering is natural filename order (`2` before `10`). To control order, prefix with a
number: `01-`, `02-` …

**Tagging photos for the garment pages (do this now, pays off later).** Any of these words
anywhere in the filename tags the photo with that garment, so it also shows on that
garment's page when garment pages are live:

| Word(s) in filename | Garment page |
| --- | --- |
| `jersey` `jerseys` `shirt` `shirts` `strip` `strips` | Playing jerseys |
| `hoodie` `hoodies` | Hoodies |
| `jacket` `jackets` | Sideline jackets |
| `tee` `tees` `training` | Training tees |
| `polo` `polos` | Committee polos |
| `shorts` `short` `leggings` `skort` `skorts` | Shorts & leggings |
| `sock` `socks` | Socks |
| `cap` `caps` `beanie` `beanies` `hat` `hats` `headwear` | Headwear |
| `bag` `bags` `backpack` | Bags & accessories |
| `singlet` `singlets` `dress` `dresses` `bodysuit` | (kept as tags for future pages) |

So `netball-riverside-dresses-2026.jpg` reads "Riverside dresses 2026", sits under Netball,
and is tagged *dresses*. `rugby-jerseys-shorts-riverside.jpg` reads "Jerseys shorts riverside"
and is tagged for both the jerseys and the shorts pages. Put the words in the order that
reads best as a caption.

**Shape:** gallery tiles are portrait **4:5 (1920 × 2400)**. Landscape photos work but are
cropped to the centre; portrait or square shots show the most.

**How many:** aim for **two or more per sport** (12+ total). Once a sport has one real photo,
that sport's placeholder tiles disappear.

Need a hand-written caption or a list of garments in the photo instead of the filename
rules? Add an entry to `src/content/projects.json` (ask David) — but for most photos the
filename is enough.

---

## 3. Fixed page photos — `src/assets/site/`

One file per slot, named exactly as below. All landscape.

| Filename | Where it shows | What to shoot | Ratio / size |
| --- | --- | --- | --- |
| `home-hero.jpg` | Homepage hero (first image visitors see) | A team in full custom kit. A cut-out or dark-background shot suits the purple hero best. | 4:3, 2400 × 1800 |
| `home-team.jpg` | Homepage "Play on instinct" section | A club team lined up in matching jerseys | 4:3, 2400 × 1800 |
| `teamwear-hero.jpg` | Teamwear page hero | A full club kit laid out flat: jersey, hoodie, shorts, polo | 4:3, 2400 × 1800 |
| `why-us-fabric.jpg` | Why buy from us page | Close-up of sublimated fabric / print detail | 4:3, 2400 × 1800 |
| `how-it-works.jpg` | How it works page hero (full site) | An organiser reviewing a design mockup (tablet, printout) | 4:3, 2400 × 1800 |
| `quote-page.jpg` | Request a quote page, side panel | A mockup sheet next to finished kit | 3:2, 2400 × 1600 |
| `contact-map.jpg` | Contact page | A map screenshot of 11/8 Dakota Crescent, Wigram | 16:9, 2400 × 1350 |
| `contact-showroom.jpg` | Contact page | The team or the showroom interior | 2:1, 2400 × 1200 |

---

## 4. Sport images — `src/assets/sports/`

Used on the sport tiles (homepage and teamwear page) now, and as the sport page hero and
feature photo when sport pages are live.

| Filename | Where it shows | What to shoot |
| --- | --- | --- |
| `<sport>.jpg` | Sport tile background, sports index card, sport page hero | The team in action or lined up in kit, 16:10 (2400 × 1500), subject centred — the homepage tiles crop it to a wide strip |
| `<sport>-feature.jpg` | Sport page feature section | 4:3 (2400 × 1800), see below |

Feature photo per sport:

| Filename | Feature photo |
| --- | --- |
| `rugby-feature.jpg` | Jersey seam and collar detail |
| `netball-feature.jpg` | Positional bib detail on a dress |
| `football-feature.jpg` | Home and away shirts side by side |
| `basketball-feature.jpg` | A reversible singlet, both faces |
| `touch-feature.jpg` | Social team tees with nicknames |
| `cultural-groups-feature.jpg` | Pattern detail on a performance top |

---

## 5. Garment images — `src/assets/garments/`

The main image shows on the **Teamwear** page cards now, and on each garment's own page when
those are live. Extra views and branding photos are only used on the garment pages, so they
can come later.

Garment ids: `jerseys` `hoodies` `jackets` `training-tees` `polos` `shorts-leggings` `socks`
`headwear` `bags`

| Filename | Where it shows | Notes |
| --- | --- | --- |
| `<garment>.jpg` | Teamwear card, garment page main image, and the garment cards on each sport page | Product-style shot, 4:3 (2400 × 1800), plain or dark background, front view |
| `<garment>-1.jpg` … `<garment>-4.jpg` | Garment page thumbnails, in order | See the view list below; 4:3 (2400 × 1800) |
| `<garment>-branding-1.jpg` … `-4.jpg` | "Where clubs put their branding" grid, in order | See the branding list below; 4:3 (2400 × 1800) |

Views (`-1` to `-4`) per garment:

| Garment | -1 | -2 | -3 | -4 |
| --- | --- | --- | --- | --- |
| jerseys | Front | Back | Collar detail | On team |
| hoodies | Front | Back | Hood detail | On team |
| jackets | Front | Back | Zip detail | On team |
| training-tees | Front | Back | Fabric detail | On team |
| polos | Front | Back | Collar detail | On team |
| shorts-leggings | Front | Back | Waistband detail | On team |
| socks | Pair | Cuff detail | Sole grip | On team |
| headwear | Cap front | Cap back | Beanie | Bucket hat |
| bags | Kit bag | Backpack | Boot bag | Name panel |

Branding spots (`-branding-1` to `-4`) per garment:

| Garment | -1 | -2 | -3 | -4 |
| --- | --- | --- | --- | --- |
| jerseys | Chest crest | Back number & name | Sleeve sponsors | Front sponsor panel |
| hoodies | Left chest logo | Full back print | Sleeve sponsors | Hood lining pattern |
| jackets | Left chest logo | Full back print | Sleeve sponsors | Collar contrast |
| training-tees | Left chest logo | Full back print | Sleeve sponsors | Side panel pattern |
| polos | Left chest logo | Sleeve sponsors | Back yoke print | Collar contrast |
| shorts-leggings | Left leg logo | Right leg number | Side panel pattern | Waistband text |
| socks | Cuff name | Calf crest | Stripe colours | Sole text |
| headwear | Front crest | Side sponsor | Back closure text | Under-peak print |
| bags | Front panel crest | Side sponsor | End-cap name | Strap text |

---

## 6. Client logos — `src/assets/logos/`

Shown as a row on the Why buy from us page ("Don't take our word for it"). Only add logos of
clubs, schools or groups that have agreed to be shown.

- Filename: `<club-name>.png` or `.svg`, e.g. `riverside-rugby-club.png`. To control order,
  prefix with a number: `01-riverside-rugby-club.png`.
- Transparent background, at least 240 px wide, trimmed to the logo (no padding).
- The filename (minus the number) becomes the logo's alt text.

---

## 7. Suggested order of work

1. **Gallery** — 12+ kit photos named by sport (section 2). This is what the ads traffic
   sees most.
2. **Homepage and teamwear heroes** — `home-hero.jpg`, `home-team.jpg`, `teamwear-hero.jpg`.
3. **Garment main images** — the nine `<garment>.jpg` files for the Teamwear page cards.
4. **Contact and trust photos** — `contact-showroom.jpg`, `why-us-fabric.jpg`,
   `quote-page.jpg`, `contact-map.jpg`, `how-it-works.jpg`.
5. **Logos** (with permission).
6. **For later** — sport heroes and features, garment views and branding photos.

## 8. Checking your work

Run `npm run dev` and open http://localhost:4321/?slots — every slot with a file shows the
photo; every slot without one still shows its placeholder with the filename it is waiting
for. The `?slots` labels show each slot's filename and its size on screen right now; drag the
browser narrower to see the tablet (640–1023 px) and phone sizes. A wrongly named file simply
won't appear; check the spelling against the tables above.
