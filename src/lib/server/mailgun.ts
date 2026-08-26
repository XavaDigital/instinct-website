import {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
  MAILGUN_API_BASE,
  FORM_TO_EMAIL,
  FORM_FROM_EMAIL,
} from 'astro:env/server';

export interface MailMessage {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: File[];
}

export type MailResult = { ok: true } | { ok: false; error: string };

export function isMailConfigured(): boolean {
  return Boolean(MAILGUN_API_KEY && MAILGUN_DOMAIN && FORM_TO_EMAIL);
}

/**
 * Sends a message through the Mailgun Messages API using multipart form data
 * (works on Cloudflare Workers and Node without an SDK).
 */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (!isMailConfigured()) {
    return { ok: false, error: 'Email is not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN, FORM_TO_EMAIL).' };
  }

  const form = new FormData();
  form.append('from', FORM_FROM_EMAIL || `Instinct Apparel website <website@${MAILGUN_DOMAIN}>`);
  form.append('to', FORM_TO_EMAIL as string);
  form.append('subject', msg.subject);
  form.append('text', msg.text);
  if (msg.html) form.append('html', msg.html);
  if (msg.replyTo) form.append('h:Reply-To', msg.replyTo);
  for (const file of msg.attachments ?? []) {
    form.append('attachment', file, file.name);
  }

  const base = (MAILGUN_API_BASE || 'https://api.mailgun.net').replace(/\/$/, '');
  const url = `${base}/v3/${MAILGUN_DOMAIN}/messages`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
      body: form,
    });
  } catch (err) {
    return { ok: false, error: `Mailgun request failed: ${(err as Error).message}` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { ok: false, error: `Mailgun responded ${response.status}: ${body.slice(0, 300)}` };
  }
  return { ok: true };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders label/value pairs as a plain-text block and a simple HTML table. */
export function renderFields(rows: [string, string][]): { text: string; html: string } {
  const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n');
  const html = `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><th align="left" style="border-bottom:1px solid #ddd;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</th><td style="border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(v || '—')}</td></tr>`,
    )
    .join('')}</table>`;
  return { text, html };
}
