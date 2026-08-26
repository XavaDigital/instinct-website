import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';

/**
 * One gallery tile. Comes either from src/content/projects.json (captioned,
 * optionally with an image) or from a photo dropped into src/assets/gallery/.
 */
export interface GalleryItem {
  id: string;
  title: string;
  /** Sport id from src/content/sports, when known */
  sport?: string;
  garments: string[];
  /** Placeholder caption when there is no image */
  label: string;
  image?: ImageMetadata;
  imageAlt?: string;
  featured: boolean;
  order: number;
}

interface SportInfo {
  id: string;
  label: string;
}

/** Every image in src/assets/gallery/, resolved at build time. */
const discovered = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/gallery/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true },
);

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** "01-netball-riverside-2.jpg" -> "netball-riverside-2" (extension and a leading sort prefix removed). */
function normaliseName(file: string): string {
  const base = (file.split('/').pop() ?? file).replace(/\.[^.]+$/, '');
  return base.replace(/^\d+[-_]+/, '');
}

function sportFromName(name: string, sports: SportInfo[]): SportInfo | undefined {
  const lower = name.toLowerCase();
  return sports.find((s) => lower === s.id || lower.startsWith(`${s.id}-`) || lower.startsWith(`${s.id}_`));
}

/**
 * Garment words recognised anywhere in a filename, mapped to the garment ids
 * used by /teamwear/<id>. They make a photo appear on that garment's page
 * (when garment pages are built) without changing its caption.
 */
const GARMENT_ALIASES: Record<string, string> = {
  jersey: 'jerseys',
  jerseys: 'jerseys',
  shirt: 'jerseys',
  shirts: 'jerseys',
  strip: 'jerseys',
  strips: 'jerseys',
  hoodie: 'hoodies',
  hoodies: 'hoodies',
  jacket: 'jackets',
  jackets: 'jackets',
  tee: 'training-tees',
  tees: 'training-tees',
  training: 'training-tees',
  polo: 'polos',
  polos: 'polos',
  shorts: 'shorts-leggings',
  short: 'shorts-leggings',
  leggings: 'shorts-leggings',
  skort: 'shorts-leggings',
  skorts: 'shorts-leggings',
  sock: 'socks',
  socks: 'socks',
  cap: 'headwear',
  caps: 'headwear',
  beanie: 'headwear',
  beanies: 'headwear',
  hat: 'headwear',
  hats: 'headwear',
  headwear: 'headwear',
  bag: 'bags',
  bags: 'bags',
  backpack: 'bags',
  // Not garment pages yet, kept as tags for later
  singlet: 'singlets',
  singlets: 'singlets',
  dress: 'dresses',
  dresses: 'dresses',
  bodysuit: 'dresses',
};

function garmentTagsFromName(name: string): string[] {
  const tags = new Set<string>();
  for (const token of name.toLowerCase().split(/[-_]+/)) {
    const id = GARMENT_ALIASES[token];
    if (id) tags.add(id);
  }
  return [...tags];
}

/**
 * "netball-riverside-2026" -> "Riverside 2026"; "rugby-final" -> "Rugby final"
 * (a single word keeps the sport for context); "netball-2" -> "Netball kit"
 * (a bare number is not a caption). Numbers inside a caption are kept, so
 * "rugby-under-12" -> "Under 12".
 */
function titleFromName(name: string, sport?: SportInfo): string {
  let rest = sport ? name.slice(sport.id.length) : name;
  rest = rest.replace(/^[-_]+/, '').replace(/[-_]+/g, ' ').trim();
  if (!rest || /^\d+$/.test(rest)) return sport ? `${sport.label} kit` : 'Custom kit';
  const words = rest.split(' ');
  const caption = sport && words.length === 1 ? `${sport.label} ${rest}` : rest;
  return caption.charAt(0).toUpperCase() + caption.slice(1);
}

async function loadSports(): Promise<SportInfo[]> {
  return (await getCollection('sports'))
    .sort((a, b) => a.data.order - b.data.order)
    .map((s) => ({ id: s.id, label: s.data.title }));
}

let cache: Promise<GalleryItem[]> | undefined;

/**
 * Photos from src/assets/gallery/ first (natural filename order), then
 * captioned projects that have an image, then placeholder projects. A sport's
 * placeholders are dropped once that sport has a real image, so the gallery
 * never mixes real and placeholder tiles within one sport.
 */
export function getGalleryItems(): Promise<GalleryItem[]> {
  cache ??= (async () => {
    const sports = await loadSports();

    const photos: GalleryItem[] = Object.entries(discovered)
      .sort(([a], [b]) => collator.compare(a, b))
      .map(([file, mod], i) => {
        const name = normaliseName(file);
        const sport = sportFromName(name, sports);
        const title = titleFromName(name, sport);
        const fileName = file.split('/').pop() ?? file;
        return {
          id: `photo-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title,
          sport: sport?.id,
          garments: garmentTagsFromName(name),
          label: title,
          image: mod.default,
          imageAlt: title,
          featured: i < 4,
          order: i,
        };
      });

    const projects: GalleryItem[] = (await getCollection('projects'))
      .sort((a, b) => a.data.order - b.data.order)
      .map((p) => ({
        id: p.id,
        title: p.data.title,
        sport: p.data.sport,
        garments: p.data.garments,
        label: p.data.label,
        image: p.data.image,
        imageAlt: p.data.imageAlt,
        featured: p.data.featured,
        order: p.data.order + 1000,
      }));

    const withImage = projects.filter((p) => p.image);
    const real = [...photos, ...withImage];
    // Same bucketing as groupBySport: unknown sports count as "more".
    const known = new Set(sports.map((s) => s.id));
    const bucket = (item: GalleryItem) => (item.sport && known.has(item.sport) ? item.sport : 'more');
    const bucketsWithReal = new Set(real.map(bucket));
    const placeholders = projects.filter((p) => !p.image && !bucketsWithReal.has(bucket(p)));
    return [...real, ...placeholders];
  })();
  return cache;
}

/** Up to `limit` items for the homepage "recent projects" strip. */
export function featuredItems(items: GalleryItem[], limit = 4): GalleryItem[] {
  const featured = items.filter((i) => i.featured);
  return [...featured, ...items.filter((i) => !featured.includes(i))].slice(0, limit);
}

/** Items for one sport only (no padding with other sports' kit). */
export function itemsForSport(items: GalleryItem[], sport: string, limit = 4): GalleryItem[] {
  return items.filter((i) => i.sport === sport).slice(0, limit);
}

/**
 * Items whose title or garment list mentions any word of a garment name
 * ("Shorts & leggings" -> "short", "legging"). No padding.
 */
export function itemsForGarment(items: GalleryItem[], garmentName: string, limit = 4): GalleryItem[] {
  const needles = garmentName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/s$/, ''));
  const matches = (text: string) => needles.some((n) => text.toLowerCase().includes(n));
  return items.filter((i) => i.garments.some(matches) || matches(i.title)).slice(0, limit);
}

export interface GalleryGroup {
  /** Sport id, or "more" for photos with no sport prefix / unknown sports */
  id: string;
  label: string;
  items: GalleryItem[];
}

/** Groups items by sport in the sports collection order; anything else lands in "More kit". */
export async function groupBySport(items: GalleryItem[]): Promise<GalleryGroup[]> {
  const sports = await loadSports();
  const known = new Set(sports.map((s) => s.id));
  const buckets = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const key = item.sport && known.has(item.sport) ? item.sport : 'more';
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const groups: GalleryGroup[] = [];
  for (const s of sports) {
    const list = buckets.get(s.id);
    if (list?.length) groups.push({ id: s.id, label: s.label, items: list });
  }
  const more = buckets.get('more');
  if (more?.length) groups.push({ id: 'more', label: 'More kit', items: more });
  return groups;
}

/** Link to the gallery, anchored to a sport's section when that section exists. */
export async function galleryHref(items: GalleryItem[], sport: string): Promise<string> {
  const groups = await groupBySport(items);
  return groups.some((g) => g.id === sport) ? `/gallery#${sport}` : '/gallery';
}
