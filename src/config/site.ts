import { IS_MVP } from './mode';

/**
 * Business details used across the site (header, footer, contact page,
 * structured data, email templates). Edit here, not in individual pages.
 */
export const site = {
  name: 'Instinct Apparel',
  shortName: 'Instinct',
  legalName: 'Instinct Apparel Limited',
  url: 'https://instinct.nz',
  tagline: 'Custom sublimated teamwear. New Zealand owned and operated.',
  description:
    'Fully custom sublimated sports uniforms and teamwear for clubs, schools and cultural groups across New Zealand. Free design mockups, no minimum order, 4–6 week turnaround.',
  email: 'hello@instinct.nz',
  phone: {
    display: '022 192 9746',
    international: '+64 22 192 9746',
    href: 'tel:+64221929746',
  },
  address: {
    street: '11/8 Dakota Crescent',
    suburb: 'Wigram',
    city: 'Christchurch',
    postcode: '8042',
    region: 'Canterbury',
    country: 'New Zealand',
    countryCode: 'NZ',
  },
  /** Google Maps link for the showroom address (used on the contact page). */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=11%2F8+Dakota+Crescent%2C+Wigram%2C+Christchurch+8042',
  hours: {
    display: 'Mon–Fri, 8.30am–5pm',
    displayLong: 'Mon–Fri, 8.30am–5pm NZT',
    short: ['Mon–Fri', '8.30am–5pm'],
    /** Schema.org OpeningHoursSpecification */
    schema: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:30',
        closes: '17:00',
      },
    ],
  },
  /** Headline numbers shown on the homepage, why-us page and quote page. */
  stats: {
    years: '12',
    clubs: '500+',
    turnaround: '4–6',
    rating: '5.0',
  },
  /** Add URLs as they exist; empty strings are skipped in the footer. */
  social: {
    facebook: '',
    instagram: '',
  },
  /** Google Business Profile review link — shown on the contact page when set. */
  googleReviewsUrl: '',
  /** Garments are made offshore — never claim "made in New Zealand" here or anywhere else. */
  announcement: ['Proudly New Zealand owned and operated', 'Free design mockups', 'No minimum order'],
} as const;

export type NavLink = { label: string; href: string };

const fullNav = {
  primary: [
    { label: 'Teamwear', href: '/teamwear' },
    { label: 'Sports', href: '/sports' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Why us', href: '/why-us' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Contact', href: '/contact' },
  ],
  cta: { label: 'Request a quote', href: '/request-a-quote' },
  footer: {
    links: [
      { label: 'Request a quote', href: '/request-a-quote' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Why buy from us', href: '/why-us' },
      { label: 'Contact', href: '/contact' },
    ],
    help: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Policies', href: '/policies' },
      { label: 'Terms & conditions', href: '/terms' },
      { label: 'Size charts', href: '/size-charts' },
    ],
  },
} satisfies { primary: NavLink[]; cta: NavLink; footer: { links: NavLink[]; help: NavLink[] } };

/** MVP (ad-landing) navigation: no sports or how-it-works; FAQ promoted to the header. */
const mvpNav = {
  ...fullNav,
  primary: [
    { label: 'Teamwear', href: '/teamwear' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Why us', href: '/why-us' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: {
    links: [
      { label: 'Request a quote', href: '/request-a-quote' },
      { label: 'Teamwear', href: '/teamwear' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Why buy from us', href: '/why-us' },
      { label: 'Contact', href: '/contact' },
    ],
    help: fullNav.footer.help,
  },
} satisfies typeof fullNav;

export const nav = IS_MVP ? mvpNav : fullNav;
