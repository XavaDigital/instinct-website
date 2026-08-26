import type { ImageMetadata } from 'astro';

/**
 * Named image slots, resolved by filename at build time. A team member drops
 * a file with the right name into the right folder and it appears — no
 * frontmatter edits. Frontmatter `image` / `heroImage` fields still win when
 * set. See IMAGE-GUIDE.md for the full convention.
 *
 *   src/assets/site/<slot>.jpg                 fixed page photos (see SiteSlot)
 *   src/assets/sports/<sport>.jpg              sport hero (tiles, sport page, sports index)
 *   src/assets/sports/<sport>-feature.jpg      sport page feature photo
 *   src/assets/garments/<garment>.jpg          garment main image (hub card + garment page)
 *   src/assets/garments/<garment>-1.jpg …      extra views on the garment page (any count, in order)
 *   src/assets/garments/<garment>-branding-1.jpg …  branding-spot photos, in the order of brandingSpots
 *   src/assets/logos/*.png|svg                 client / school logos row on the why-us page
 */

type Glob = Record<string, { default: ImageMetadata }>;
const EXT = '{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}';

const siteGlob = import.meta.glob<{ default: ImageMetadata }>('/src/assets/site/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', { eager: true });
const sportsGlob = import.meta.glob<{ default: ImageMetadata }>('/src/assets/sports/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', { eager: true });
const garmentsGlob = import.meta.glob<{ default: ImageMetadata }>('/src/assets/garments/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', { eager: true });
const logosGlob = import.meta.glob<{ default: ImageMetadata }>('/src/assets/logos/*.{png,svg,jpg,jpeg,webp,PNG,SVG,JPG,JPEG,WEBP}', { eager: true });
void EXT;

/** basename without extension, lower-cased */
function key(file: string): string {
  return (file.split('/').pop() ?? file).replace(/\.[^.]+$/, '').toLowerCase();
}

function index(glob: Glob): Map<string, ImageMetadata> {
  const map = new Map<string, ImageMetadata>();
  for (const [file, mod] of Object.entries(glob).sort(([a], [b]) => a.localeCompare(b))) {
    map.set(key(file), mod.default);
  }
  return map;
}

const SITE = index(siteGlob);
const SPORTS = index(sportsGlob);
const GARMENTS = index(garmentsGlob);

export type SiteSlot =
  | 'home-hero'
  | 'home-team'
  | 'teamwear-hero'
  | 'why-us-fabric'
  | 'how-it-works'
  | 'quote-page'
  | 'contact-map'
  | 'contact-showroom';

export function siteImage(slot: SiteSlot): ImageMetadata | undefined {
  return SITE.get(slot);
}

export function sportHero(id: string): ImageMetadata | undefined {
  return SPORTS.get(id.toLowerCase());
}

export function sportFeature(id: string): ImageMetadata | undefined {
  return SPORTS.get(`${id.toLowerCase()}-feature`);
}

export function garmentImage(id: string): ImageMetadata | undefined {
  return GARMENTS.get(id.toLowerCase());
}

/** `<id>-1`, `<id>-2`, … in numeric order (gaps allowed). */
function numbered(map: Map<string, ImageMetadata>, prefix: string): ImageMetadata[] {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  return [...map.entries()]
    .map(([k, img]) => {
      const m = re.exec(k);
      return m ? { n: Number(m[1]), img } : null;
    })
    .filter((x): x is { n: number; img: ImageMetadata } => x !== null)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.img);
}

export function garmentViews(id: string): ImageMetadata[] {
  return numbered(GARMENTS, id.toLowerCase());
}

export function garmentBranding(id: string): ImageMetadata[] {
  return numbered(GARMENTS, `${id.toLowerCase()}-branding`);
}

export function clientLogos(): { name: string; image: ImageMetadata }[] {
  return Object.entries(logosGlob)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, mod]) => ({
      name: key(file)
        .replace(/^\d+[-_]+/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase()),
      image: mod.default,
    }));
}
