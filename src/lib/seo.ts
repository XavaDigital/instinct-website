import { site } from '@/config/site';

export type Crumb = { label: string; href?: string };

/** Absolute URL for a site path. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/** Serialise JSON-LD safely for inlining inside a <script> tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** FAQ answers are authored with inline markdown links; structured data wants plain text. */
export function plainAnswer(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s*\n\s*\n\s*/g, ' ')
    .trim();
}

export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

/** LocalBusiness + WebSite graph, included on every page. */
export function organizationJsonLd() {
  const sameAs = Object.values(site.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': ORGANIZATION_ID,
        name: site.name,
        legalName: site.legalName,
        url: site.url,
        description: site.description,
        telephone: site.phone.international,
        email: site.email,
        image: absoluteUrl('/og-default.png'),
        logo: absoluteUrl('/icon-512.png'),
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${site.address.street}, ${site.address.suburb}`,
          addressLocality: site.address.city,
          addressRegion: site.address.region,
          postalCode: site.address.postcode,
          addressCountry: site.address.countryCode,
        },
        areaServed: { '@type': 'Country', name: 'New Zealand' },
        openingHoursSpecification: site.hours.schema,
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: site.url,
        name: site.name,
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: 'en-NZ',
      },
    ],
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
}

/**
 * FAQPage node. Pass `page` to make it the page's main entity (name/url) —
 * use on exactly one URL per set of questions.
 */
export function faqJsonLd(
  items: { q: string; a: string }[],
  page?: { name: string; description: string; url: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(page
      ? {
          name: page.name,
          description: page.description,
          url: absoluteUrl(page.url),
          isPartOf: { '@id': WEBSITE_ID },
          inLanguage: 'en-NZ',
        }
      : {}),
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: plainAnswer(f.a) },
    })),
  };
}

export function productJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  price: { from: number };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.url),
    image: absoluteUrl(opts.image ?? '/og-default.png'),
    brand: { '@type': 'Brand', name: site.name },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'NZD',
      lowPrice: opts.price.from,
      offerCount: 1,
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORGANIZATION_ID },
      url: absoluteUrl(opts.url),
    },
  };
}

export function webPageJsonLd(opts: { name: string; description: string; url: string; type?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type ?? 'WebPage',
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.url),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-NZ',
  };
}
