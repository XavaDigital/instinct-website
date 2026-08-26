import { useCallback, useRef, useState, type SyntheticEvent } from 'react';
import { flushSync } from 'react-dom';
import { LIMITS, validateContact } from '@/lib/forms';
import {
  BotChecks,
  ErrorBanner,
  Field,
  LiveStatus,
  Turnstile,
  clearUrlError,
  readAttribution,
  resetTurnstile,
  safeRedirect,
  submitForm,
  useNoValidateAfterHydration,
  useResetOnBfcacheRestore,
  useTurnstile,
  useUrlError,
  type Status,
} from './form-shared';

interface Props {
  turnstileSiteKey?: string;
  contactEmail: string;
}

const THANKS = '/thanks/contact?sent=1';

export default function ContactForm({ turnstileSiteKey }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [live, setLive] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(Date.now());
  useUrlError(setStatus);
  useTurnstile(turnstileSiteKey);
  useNoValidateAfterHydration(formRef);
  useResetOnBfcacheRestore(
    useCallback(() => {
      setStatus('idle');
      setErrors({});
      setMessage(undefined);
      setLive('');
      resetTurnstile();
    }, []),
  );

  const submitting = status === 'submitting';

  function focusFirstError(errs: Record<string, string>) {
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(`f-${first}`)?.focus();
  }

  async function onSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    data.set('ts', String(startedAt.current));
    const fields = {
      name: String(data.get('name') ?? ''),
      org: String(data.get('org') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      message: String(data.get('message') ?? ''),
    };
    const clientErrors = validateContact(fields);
    if (Object.keys(clientErrors).length > 0) {
      flushSync(() => {
        setErrors(clientErrors);
        setMessage('Please check the highlighted fields.');
        setLive('Please check the highlighted fields.');
        setStatus('error');
      });
      focusFirstError(clientErrors);
      return;
    }

    clearUrlError();
    setStatus('submitting');
    setErrors({});
    setMessage(undefined);
    setLive('Sending your message…');
    const attribution = readAttribution();
    if (attribution) data.set('attribution', attribution);
    const result = await submitForm('/api/contact', data);
    if (result.ok) {
      // Stay in the "submitting" state until the browser has left for the
      // thanks page (the conversion goal for analytics and ads).
      setLive('Message sent.');
      window.location.assign(safeRedirect(result.redirect, THANKS));
    } else {
      resetTurnstile();
      flushSync(() => {
        setErrors(result.errors ?? {});
        setMessage(result.error);
        setLive(result.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      });
      if (result.errors) focusFirstError(result.errors);
    }
  }

  return (
    <>
      <LiveStatus message={live} />
      <form
        ref={formRef}
        action="/api/contact"
        method="post"
        onSubmit={onSubmit}
        className="panel relative px-6 py-8 sm:px-8 sm:py-[34px]"
      >
        <BotChecks startedAt={startedAt.current} />

        <h2 className="card-title text-[26px]">Send us a message</h2>
        <p className="mb-6 mt-[6px] text-[15px] leading-[1.6] text-white/[0.62]">
          After a full price instead? The{' '}
          <a href="/request-a-quote" className="link-inline">
            quote request form
          </a>{' '}
          gets you there faster.
        </p>

        {status === 'error' && (
          <div className="mb-6">
            <ErrorBanner message={message ?? 'Something went wrong sending your message. Please try again.'} />
          </div>
        )}

        <div className="grid gap-x-[18px] gap-y-4 sm:grid-cols-2">
          <Field label="Your name" name="name" required error={errors.name}>
            {(p) => (
              <input
                id={p.id}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                maxLength={LIMITS.name}
                className="field-input"
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              />
            )}
          </Field>
          <Field label="Club, school or group" name="org" error={errors.org}>
            {(p) => (
              <input
                id={p.id}
                name="org"
                type="text"
                autoComplete="organization"
                placeholder="Riverside Rugby Club"
                maxLength={LIMITS.org}
                className="field-input"
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
              />
            )}
          </Field>
          <Field label="Email" name="email" required error={errors.email}>
            {(p) => (
              <input
                id={p.id}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="jane@club.co.nz"
                maxLength={LIMITS.email}
                className="field-input"
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              />
            )}
          </Field>
          <Field label="Phone" name="phone" error={errors.phone}>
            {(p) => (
              <input
                id={p.id}
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="021 000 0000"
                maxLength={LIMITS.phone}
                className="field-input"
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
              />
            )}
          </Field>
          <Field label="How can we help?" name="message" required error={errors.message} className="sm:col-span-2">
            {(p) => (
              <textarea
                id={p.id}
                name="message"
                rows={5}
                placeholder="Tell us what you're after…"
                maxLength={LIMITS.message}
                className="field-input min-h-[120px] resize-y leading-[1.5]"
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              />
            )}
          </Field>
        </div>

        {turnstileSiteKey && (
          <div className="mt-6">
            <Turnstile siteKey={turnstileSiteKey} />
          </div>
        )}

        <button type="submit" className="btn btn-primary mt-6" aria-disabled={submitting}>
          {submitting ? (
            'Sending…'
          ) : (
            <>
              Send message <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>
    </>
  );
}
