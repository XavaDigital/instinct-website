import { getCollection } from 'astro:content';
import { IS_MVP } from '@/config/mode';

export interface Testimonial {
  quote: string;
  author: string;
}

/**
 * Testimonials for a page context. Entries flagged `placeholder: true` are
 * shown on the full site (so layouts can be reviewed) but never in the MVP
 * build, which receives real advertising traffic. Callers should hide the
 * section when the list is empty.
 */
export async function testimonialsFor(context: string, limit = 3): Promise<Testimonial[]> {
  const all = await getCollection('testimonials');
  return all
    .filter((t) => t.data.context === context && !(IS_MVP && t.data.placeholder))
    .slice(0, limit)
    .map((t) => ({ quote: t.data.quote, author: t.data.author }));
}
