import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.string().optional() });
const faqItem = z.object({ q: z.string(), a: z.string() });

/** Sport landing pages: /sports/[id] */
const sports = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/sports' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      navLabel: z.string().optional(),
      /** Overrides the default "<title>Custom {navLabel} Uniforms</title>" */
      seoTitle: z.string().optional(),
      order: z.number().default(99),
      description: z.string(),
      eyebrow: z.string(),
      heroTitle: z.string(),
      intro: z.string(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      heroLabel: z.string(),
      highlights: z.array(z.string()).max(4),
      garmentsEyebrow: z.string(),
      garmentsTitle: z.string(),
      garments: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          href: z.string().optional(),
          label: z.string().optional(),
        }),
      ),
      extras: z.array(link).default([]),
      feature: z
        .object({
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          tags: z.array(z.string()).optional(),
          imageLabel: z.string(),
        })
        .optional(),
      projectsTitle: z.string(),
      faqs: z.array(faqItem).default([]),
      testimonial: z.object({ quote: z.string(), author: z.string() }).optional(),
      ctaTitle: z.string(),
      ctaBody: z.string(),
    }),
});

/** Garment pages: /teamwear/[id] */
const garments = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/garments' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(), // "Hoodies"
      title: z.string(), // "Custom club hoodie"
      cardTitle: z.string(), // "Hoodies & jackets"
      cardBlurb: z.string(),
      order: z.number().default(99),
      featured: z.boolean().default(false),
      description: z.string(),
      intro: z.string(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      imageLabel: z.string(),
      thumbLabels: z.array(z.string()).default([]),
      options: z
        .array(z.object({ label: z.string(), values: z.array(z.string()) }))
        .default([]),
      sizes: z.array(z.string()).default([]),
      sizeChart: z.string().optional(),
      price: z
        .object({ from: z.number(), unit: z.string(), quantity: z.number() })
        .optional(),
      priceNote: z.string().optional(),
      badges: z
        .array(z.string())
        .default(['3–4 week turnaround', 'No minimums', 'Free mockup']),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      brandingTitle: z.string().optional(),
      brandingSpots: z.array(z.string()).default([]),
      projectsTitle: z.string().optional(),
      pairsWith: z.array(z.string()).default([]),
      ctaTitle: z.string(),
      ctaBody: z.string(),
    }),
});

/** FAQ categories, one JSON file each: /faq */
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faqs' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
    items: z.array(faqItem).min(1),
  }),
});

/** Policies, one markdown file each: /policies/[id] */
const policies = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/policies' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    inShort: z.string(),
    updated: z.coerce.date(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

/** Long-form legal pages (terms and conditions) */
const legal = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    intro: z.string(),
    updated: z.coerce.date(),
  }),
});

const testimonials = defineCollection({
  loader: file('./src/content/testimonials.json'),
  schema: z.object({
    quote: z.string(),
    author: z.string(),
    /** Where the quote is shown: general, why-us, quote, how-it-works, or a sport id */
    context: z.string().default('general'),
    placeholder: z.boolean().default(false),
  }),
});

/** Gallery projects */
const projects = defineCollection({
  loader: file('./src/content/projects.json'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      sport: z.string(),
      garments: z.array(z.string()).default([]),
      label: z.string(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      featured: z.boolean().default(false),
      order: z.number().default(99),
    }),
});

const sizeCharts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/size-charts' }),
  schema: z.object({
    title: z.string(),
    garment: z.string().optional(),
    order: z.number().default(99),
    note: z.string().optional(),
    columns: z.array(z.string()).min(2),
    rows: z.array(z.array(z.union([z.string(), z.number()]))).min(1),
  }),
});

export const collections = {
  sports,
  garments,
  faqs,
  policies,
  legal,
  testimonials,
  projects,
  sizeCharts,
};
