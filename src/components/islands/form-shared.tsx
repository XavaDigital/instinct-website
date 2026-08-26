import { useEffect, type ReactNode } from 'react';

export type Status = 'idle' | 'submitting' | 'error';

export type SubmitResult =
  | { ok: true; redirect?: string }
  | { ok: false; errors?: Record<string, string>; error?: string };

/** Only same-origin paths may be used as a post-submit destination. */
export function safeRedirect(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/**
 * Browsers restore the frozen React tree from the back/forward cache when the
 * visitor presses Back from the thanks page; return the form to idle so it can
 * be used again.
 */
export function useResetOnBfcacheRestore(reset: () => void) {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [reset]);
}

/** Removes the `#error` fragment left by the no-JavaScript fallback once the island takes over. */
export function clearUrlError() {
  if (window.location.hash === '#error') {
    try {
      history.replaceState(history.state, '', window.location.pathname + window.location.search);
    } catch {
      // ignore
    }
  }
}

/** POSTs a FormData payload and normalises the JSON reply. */
export async function submitForm(url: string, data: FormData): Promise<SubmitResult> {
  try {
    const res = await fetch(url, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      redirect?: string;
      errors?: Record<string, string>;
      error?: string;
    };
    if (res.ok && body.ok) return { ok: true, redirect: body.redirect };
    return {
      ok: false,
      errors: body.errors,
      error:
        body.error ??
        (res.status === 422 ? 'Please check the highlighted fields.' : 'Something went wrong. Please try again.'),
    };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
  }
}

/**
 * Seeds the island's status with 'error' when the no-JavaScript fallback
 * redirected back with `#error`, so the banner clears on the next submit.
 */
export function useUrlError(setStatus: (status: Status) => void) {
  useEffect(() => {
    if (window.location.hash === '#error') setStatus('error');
  }, [setStatus]);
}

/** Campaign attribution stored by the layout script (UTM parameters, click IDs, referrer). */
export function readAttribution(): string {
  try {
    return window.localStorage.getItem('instinct_attribution') ?? '';
  } catch {
    return '';
  }
}

/** Loads the Turnstile script once when a site key is configured. */
export function useTurnstile(siteKey?: string) {
  useEffect(() => {
    if (!siteKey || document.querySelector('script[data-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = '1';
    document.head.appendChild(script);
  }, [siteKey]);
}

/** A Turnstile token is single-use; call after any failed submission. */
export function resetTurnstile() {
  try {
    (window as unknown as { turnstile?: { reset: (id?: string | HTMLElement) => void } }).turnstile?.reset();
  } catch {
    // widget not rendered yet
  }
}

/** `action` is echoed back by siteverify; the server requires it to match. */
export function Turnstile({ siteKey, action }: { siteKey?: string; action: 'quote' | 'contact' }) {
  if (!siteKey) return null;
  // min-h reserves the widget's height so it doesn't shift the form when it loads.
  return (
    <div
      className="cf-turnstile min-h-[65px]"
      data-sitekey={siteKey}
      data-action={action}
      data-theme="dark"
      data-size="flexible"
    />
  );
}

/** Hidden fields used by the server's bot checks. */
export function BotChecks({ startedAt }: { startedAt: number }) {
  return (
    <>
      <input type="hidden" name="ts" value={startedAt} />
      <div className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}

/** Persistent polite live region; keep it at the same tree position in every state. */
export function LiveStatus({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}

/** Disables native validation only once React has taken over, so no-JS users keep it. */
export function useNoValidateAfterHydration(ref: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (ref.current) ref.current.noValidate = true;
  }, [ref]);
}

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ label, name, required, error, className, children }: FieldProps) {
  const id = `f-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <>
            <span className="text-lime" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {children({ id, describedBy: error ? errorId : undefined, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="border border-[#ff7a7a]/60 bg-[#ff7a7a]/10 px-4 py-3 text-[14.5px] text-[#ffd6d6]">{message}</div>
  );
}
