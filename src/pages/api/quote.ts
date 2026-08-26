import type { APIRoute } from 'astro';
import {
  ARTWORK_MAX_TOTAL_BYTES,
  GARMENT_OTHER,
  SPORT_OTHER,
  validateArtwork,
  validateQuote,
} from '@/lib/forms';
import { renderFields, sendMail } from '@/lib/server/mailgun';
import { rateLimited } from '@/lib/server/ratelimit';
import {
  attributionRows,
  bodyTooLarge,
  clientIp,
  field,
  fieldList,
  files,
  json,
  looksLikeBot,
  redirect,
  verifyTurnstile,
  wantsHtml,
} from '@/lib/server/request';
import { site } from '@/config/site';

export const prerender = false;

const PAGE = '/request-a-quote';
/** Genuine sends carry the one-shot marker that lets the thanks page fire analytics. */
const THANKS = '/thanks/quote?sent=1';
/** Bots are sent to the same page without the marker, so they never count as leads. */
const THANKS_QUIET = '/thanks/quote';
const MAX_BODY = ARTWORK_MAX_TOTAL_BYTES + 512 * 1024;
const FALLBACK = `We couldn't send your request just now. Please email ${site.email} or call ${site.phone.display}.`;

export const POST: APIRoute = async ({ request }) => {
  const html = wantsHtml(request);
  const fail = (status: number, error: string, errors?: Record<string, string>) =>
    html ? redirect(`${PAGE}#error`) : json({ ok: false, error, errors }, status);

  if (bodyTooLarge(request, MAX_BODY)) {
    return fail(413, 'That submission is too large. Please attach fewer or smaller files.');
  }

  const ip = clientIp(request) ?? 'unknown';
  if (rateLimited(`quote:${ip}`)) {
    return fail(429, 'Too many requests from your connection. Please wait a few minutes and try again.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Could not read the form.');
  }

  // Bots get a quiet "success" so they don't learn anything.
  if (looksLikeBot(form)) {
    return html ? redirect(THANKS_QUIET) : json({ ok: true, redirect: THANKS_QUIET });
  }

  const fields = {
    name: field(form, 'name'),
    role: field(form, 'role'),
    email: field(form, 'email'),
    phone: field(form, 'phone'),
    org: field(form, 'org'),
    garments: fieldList(form, 'garments', 40),
    garmentsOther: field(form, 'garmentsOther'),
    sport: field(form, 'sport'),
    sportOther: field(form, 'sportOther'),
    quantity: field(form, 'quantity'),
    neededBy: field(form, 'neededBy'),
    notes: field(form, 'notes', { multiline: true }),
  };

  const errors = validateQuote(fields);
  const artwork = files(form, 'artwork');
  const artworkError = validateArtwork(artwork);
  if (artworkError) errors.artwork = artworkError;
  if (Object.keys(errors).length > 0) {
    return fail(422, 'Please check the highlighted fields.', errors);
  }

  if (!(await verifyTurnstile(form, ip))) {
    return fail(400, 'The spam check did not pass. Please try again.');
  }

  // Fold the free-text "Other" answers into the values staff read.
  const garmentsLabel = fields.garments
    .map((g) => (g === GARMENT_OTHER && fields.garmentsOther ? `Other: ${fields.garmentsOther}` : g))
    .join(', ');
  const sportLabel = fields.sport === SPORT_OTHER && fields.sportOther ? `Other: ${fields.sportOther}` : fields.sport;

  const rows: [string, string][] = [
    ['Name', fields.name],
    ['Role', fields.role],
    ['Email', fields.email],
    ['Phone', fields.phone],
    ['Club / school / group', fields.org],
    ['Garments', garmentsLabel],
    ['Sport / group type', sportLabel],
    ['Approx. quantity', fields.quantity],
    ['Needed by', fields.neededBy],
    ['Notes', fields.notes],
    [
      'Artwork attached',
      artwork.length ? artwork.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(', ') : 'None',
    ],
    ...attributionRows(form),
  ];
  const body = renderFields(rows);

  const result = await sendMail({
    subject: `Quote request — ${fields.org} (${sportLabel}, ${fields.quantity})`,
    text: `New quote request from the website.\n\n${body.text}\n\nReply to this email to respond to ${fields.name}.`,
    html: `<p>New quote request from the website.</p>${body.html}<p>Reply to this email to respond.</p>`,
    replyTo: fields.email,
    attachments: artwork,
  });

  if (!result.ok) {
    console.error('[quote] send failed:', result.error);
    return fail(502, FALLBACK);
  }

  return html ? redirect(THANKS) : json({ ok: true, redirect: THANKS });
};

export const GET: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405, { allow: 'POST' });
