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
import { planFiles, storeArtwork } from '@/lib/server/artwork';
import { getArtworkStore, getDb } from '@/lib/server/bindings';
import { markEmail, markFiles, recordSubmission } from '@/lib/server/store';
import {
  attributionData,
  attributionRows,
  bodyTooLarge,
  cleanFileName,
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

  if (!(await verifyTurnstile(form, { ip, hostname: new URL(request.url).hostname, action: 'quote' }))) {
    return fail(400, 'The spam check did not pass. Please try again.');
  }

  // Fold the free-text "Other" answers into the values staff read.
  const garmentsLabel = fields.garments
    .map((g) => (g === GARMENT_OTHER && fields.garmentsOther ? `Other: ${fields.garmentsOther}` : g))
    .join(', ');
  const sportLabel = fields.sport === SPORT_OTHER && fields.sportOther ? `Other: ${fields.sportOther}` : fields.sport;
  // Quantity is free text; keep the subject line short (the full answer is in the
  // body). Cut on code points so an emoji is never split into a stray half.
  const quantityChars = Array.from(fields.quantity);
  const quantityShort = quantityChars.length > 40 ? `${quantityChars.slice(0, 39).join('')}…` : fields.quantity;

  const artworkNames = artwork.map((f) => cleanFileName(f.name));

  // Log the lead first, so it survives an email outage (best-effort; see store.ts).
  const db = getDb();
  const rowId = await recordSubmission(db, {
    type: 'quote',
    name: fields.name,
    role: fields.role,
    email: fields.email,
    phone: fields.phone,
    org: fields.org,
    sport: sportLabel,
    garments: garmentsLabel,
    quantity: fields.quantity,
    neededBy: fields.neededBy,
    message: fields.notes,
    artwork: artworkNames,
    source: attributionData(form),
    page: new URL(request.url).hostname,
  });
  // Keep a downloadable copy of each attachment, recorded against the row (best-effort;
  // skipped when the row itself could not be written, so nothing is stored unreferenced).
  if (rowId !== null && artwork.length) {
    const storedFiles = await storeArtwork(getArtworkStore(), planFiles(artwork, artworkNames, rowId), artwork);
    await markFiles(db, rowId, storedFiles);
  }

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
      artwork.length ? artwork.map((f, i) => `${artworkNames[i]} (${Math.round(f.size / 1024)} KB)`).join(', ') : 'None',
    ],
    ...attributionRows(form),
  ];
  const body = renderFields(rows);

  const result = await sendMail({
    subject: `Quote request — ${fields.org} (${sportLabel}, ${quantityShort})`,
    text: `New quote request from the website.\n\n${body.text}\n\nReply to this email to respond to ${fields.name}.`,
    html: `<p>New quote request from the website.</p>${body.html}<p>Reply to this email to respond.</p>`,
    replyTo: fields.email,
    attachments: artwork,
  });

  if (!result.ok) {
    console.error('[quote] send failed:', result.error);
    await markEmail(db, rowId, 'failed', result.error);
    return fail(502, FALLBACK);
  }
  await markEmail(db, rowId, 'sent');

  return html ? redirect(THANKS) : json({ ok: true, redirect: THANKS });
};

export const GET: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405, { allow: 'POST' });
