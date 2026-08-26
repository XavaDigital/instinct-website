import type { APIRoute } from 'astro';
import { validateContact } from '@/lib/forms';
import { renderFields, sendMail } from '@/lib/server/mailgun';
import { rateLimited } from '@/lib/server/ratelimit';
import { getDb } from '@/lib/server/bindings';
import { markEmail, recordSubmission } from '@/lib/server/store';
import {
  attributionData,
  attributionRows,
  bodyTooLarge,
  clientIp,
  field,
  json,
  looksLikeBot,
  redirect,
  verifyTurnstile,
  wantsHtml,
} from '@/lib/server/request';
import { site } from '@/config/site';

export const prerender = false;

const PAGE = '/contact';
/** Genuine sends carry the one-shot marker that lets the thanks page fire analytics. */
const THANKS = '/thanks/contact?sent=1';
/** Bots are sent to the same page without the marker, so they never count as leads. */
const THANKS_QUIET = '/thanks/contact';
const MAX_BODY = 64 * 1024;
const FALLBACK = `We couldn't send your message just now. Please email ${site.email} or call ${site.phone.display}.`;

export const POST: APIRoute = async ({ request }) => {
  const html = wantsHtml(request);
  const fail = (status: number, error: string, errors?: Record<string, string>) =>
    html ? redirect(`${PAGE}#error`) : json({ ok: false, error, errors }, status);

  if (bodyTooLarge(request, MAX_BODY)) {
    return fail(413, 'That message is too long to send. Please shorten it and try again.');
  }

  const ip = clientIp(request) ?? 'unknown';
  if (rateLimited(`contact:${ip}`)) {
    return fail(429, 'Too many requests from your connection. Please wait a few minutes and try again.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Could not read the form.');
  }

  if (looksLikeBot(form)) {
    return html ? redirect(THANKS_QUIET) : json({ ok: true, redirect: THANKS_QUIET });
  }

  const fields = {
    name: field(form, 'name'),
    org: field(form, 'org'),
    email: field(form, 'email'),
    phone: field(form, 'phone'),
    message: field(form, 'message', { multiline: true }),
  };

  const errors = validateContact(fields);
  if (Object.keys(errors).length > 0) {
    return fail(422, 'Please check the highlighted fields.', errors);
  }

  if (!(await verifyTurnstile(form, { ip, hostname: new URL(request.url).hostname, action: 'contact' }))) {
    return fail(400, 'The spam check did not pass. Please try again.');
  }

  // Log the message first, so it survives an email outage (best-effort; see store.ts).
  const db = getDb();
  const rowId = await recordSubmission(db, {
    type: 'contact',
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    org: fields.org,
    message: fields.message,
    source: attributionData(form),
    page: new URL(request.url).hostname,
  });

  const body = renderFields([
    ['Name', fields.name],
    ['Club / school / group', fields.org],
    ['Email', fields.email],
    ['Phone', fields.phone],
    ['Message', fields.message],
    ...attributionRows(form),
  ]);

  const result = await sendMail({
    subject: `Website message — ${fields.name}${fields.org ? ` (${fields.org})` : ''}`,
    text: `New message from the website contact form.\n\n${body.text}`,
    html: `<p>New message from the website contact form.</p>${body.html}`,
    replyTo: fields.email,
  });

  if (!result.ok) {
    console.error('[contact] send failed:', result.error);
    await markEmail(db, rowId, 'failed', result.error);
    return fail(502, FALLBACK);
  }
  await markEmail(db, rowId, 'sent');

  return html ? redirect(THANKS) : json({ ok: true, redirect: THANKS });
};

export const GET: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405, { allow: 'POST' });
