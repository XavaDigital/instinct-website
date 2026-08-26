import { useCallback, useEffect, useRef, useState, type DragEvent, type SyntheticEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  ARTWORK_ACCEPT,
  ARTWORK_MAX_FILES,
  ARTWORK_MAX_TOTAL_BYTES,
  GARMENT_OTHER,
  LIMITS,
  SPORT_OTHER,
  formatBytes,
  validateArtwork,
  validateQuote,
} from '@/lib/forms';
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
  sports: { value: string; label: string }[];
  garments: readonly string[];
  quantities: readonly string[];
  turnstileSiteKey?: string;
  contactEmail: string;
  phone: string;
}

const THANKS = '/thanks/quote?sent=1';

export default function QuoteForm({ sports, garments, quantities, turnstileSiteKey, phone }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [live, setLive] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sportIsOther, setSportIsOther] = useState(false);
  const [garmentIsOther, setGarmentIsOther] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
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
      setFiles([]);
      resetTurnstile();
    }, []),
  );

  // Browsers restore form values on reload / back navigation, and a user can
  // change controls before hydration; read the real values once on mount.
  useEffect(() => {
    syncRevealState();
  }, []);

  function syncRevealState() {
    const form = formRef.current;
    if (!form) return;
    const sport = form.querySelector<HTMLSelectElement>('select[name="sport"]')?.value ?? '';
    const other = form.querySelector<HTMLInputElement>(`input[name="garments"][value="${GARMENT_OTHER}"]`);
    setSportIsOther(sport === SPORT_OTHER);
    setGarmentIsOther(Boolean(other?.checked));
  }

  const submitting = status === 'submitting';

  function applyFiles(next: File[]) {
    const kept = next.slice(0, ARTWORK_MAX_FILES);
    setFiles(kept);
    setErrors((e) => {
      const copy = { ...e };
      const problem = validateArtwork(kept);
      if (problem) copy.artwork = problem;
      else delete copy.artwork;
      return copy;
    });
    if (fileInput.current) fileInput.current.value = '';
  }

  function addFiles(list: FileList | File[]) {
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!next.some((n) => n.name === f.name && n.size === f.size)) next.push(f);
    }
    applyFiles(next);
  }

  function removeFile(index: number) {
    applyFiles(files.filter((_, i) => i !== index));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  function focusFirstError(errs: Record<string, string>) {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el =
      first === 'garments'
        ? formRef.current?.querySelector<HTMLElement>('input[name="garments"]')
        : first === 'artwork'
          ? fileInput.current
          : (document.getElementById(`f-${first}`) as HTMLElement | null);
    el?.focus();
  }

  async function onSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (submitting) return;
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    data.set('ts', String(startedAt.current));
    data.delete('artwork');
    files.forEach((f) => data.append('artwork', f));

    const fields = {
      name: String(data.get('name') ?? ''),
      role: String(data.get('role') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      org: String(data.get('org') ?? ''),
      garments: data.getAll('garments').map(String),
      garmentsOther: String(data.get('garmentsOther') ?? ''),
      sport: String(data.get('sport') ?? ''),
      sportOther: String(data.get('sportOther') ?? ''),
      quantity: String(data.get('quantity') ?? ''),
      neededBy: String(data.get('neededBy') ?? ''),
      notes: String(data.get('notes') ?? ''),
    };
    const clientErrors = validateQuote(fields);
    const artworkError = validateArtwork(files);
    if (artworkError) clientErrors.artwork = artworkError;
    if (Object.keys(clientErrors).length > 0) {
      flushSync(() => {
        setSportIsOther(fields.sport === SPORT_OTHER);
        setGarmentIsOther(fields.garments.includes(GARMENT_OTHER));
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
    setLive('Sending your request…');
    const attribution = readAttribution();
    if (attribution) data.set('attribution', attribution);
    const result = await submitForm('/api/quote', data);
    if (result.ok) {
      // Stay in the "submitting" state until the browser has left for the
      // thanks page (the conversion goal for analytics and ads).
      setLive('Request sent.');
      window.location.assign(safeRedirect(result.redirect, THANKS));
    } else {
      resetTurnstile();
      flushSync(() => {
        setSportIsOther(fields.sport === SPORT_OTHER);
        setGarmentIsOther(fields.garments.includes(GARMENT_OTHER));
        setErrors(result.errors ?? {});
        setMessage(result.error);
        setLive(result.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      });
      if (result.errors) focusFirstError(result.errors);
    }
  }

  const artworkDescribedBy = ['f-artwork-hint', 'f-artwork-limit', errors.artwork ? 'f-artwork-error' : '']
    .filter(Boolean)
    .join(' ');
  const inputClass = 'field-input';
  const totalBytes = files.reduce((n, f) => n + f.size, 0);

  return (
    <>
      <LiveStatus message={live} />
      <form
        ref={formRef}
        action="/api/quote"
        method="post"
        encType="multipart/form-data"
        onSubmit={onSubmit}
        className="panel relative px-6 py-8 sm:px-[34px] sm:py-9"
      >
        <BotChecks startedAt={startedAt.current} />

        {status === 'error' && (
          <div className="mb-6">
            <ErrorBanner message={message ?? 'Something went wrong sending your request. Please try again.'} />
          </div>
        )}

        <div className="mb-6 flex items-baseline gap-3">
          <h2 className="card-title text-[22px]">Your details</h2>
          <span className="text-[13px] text-white/60" aria-hidden="true">
            * required
          </span>
        </div>

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
                className={inputClass}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              />
            )}
          </Field>
          <Field label="Your role" name="role" error={errors.role}>
            {(p) => (
              <input
                id={p.id}
                name="role"
                type="text"
                autoComplete="organization-title"
                placeholder="Club secretary"
                maxLength={LIMITS.role}
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
              />
            )}
          </Field>
          <Field label="Club, school or group" name="org" required error={errors.org} className="sm:col-span-2">
            {(p) => (
              <input
                id={p.id}
                name="org"
                type="text"
                autoComplete="organization"
                placeholder="Riverside Rugby Club"
                maxLength={LIMITS.org}
                className={inputClass}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              />
            )}
          </Field>
        </div>

        <hr className="my-7 border-white/10" />

        <h2 className="card-title mb-5 text-[22px]">Your order</h2>

        <fieldset className="mb-6">
          <legend className="field-label mb-[10px] block">
            What do you need?
            <span className="text-lime" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </legend>
          <div className="flex flex-wrap gap-[10px]">
            {garments.map((g) => (
              <label key={g} className="chip relative">
                <input
                  type="checkbox"
                  name="garments"
                  value={g}
                  aria-invalid={Boolean(errors.garments)}
                  aria-describedby={errors.garments ? 'f-garments-error' : undefined}
                  aria-controls={g === GARMENT_OTHER ? 'f-garmentsOther-wrap' : undefined}
                  aria-expanded={g === GARMENT_OTHER ? garmentIsOther : undefined}
                  onChange={
                    g === GARMENT_OTHER
                      ? (e) => {
                          setGarmentIsOther(e.target.checked);
                          if (e.target.checked) setLive('Extra field shown: What else do you need?');
                        }
                      : undefined
                  }
                />
                <span className="chip-check" aria-hidden="true">
                  ✓
                </span>
                {g}
              </label>
            ))}
          </div>
          {errors.garments && (
            <p id="f-garments-error" className="field-error mt-2">
              {errors.garments}
            </p>
          )}
          <div id="f-garmentsOther-wrap" className="mt-4" hidden={!garmentIsOther}>
            <Field label="What else do you need?" name="garmentsOther" required error={errors.garmentsOther}>
              {(p) => (
                <input
                  id={p.id}
                  name="garmentsOther"
                  type="text"
                  placeholder="e.g. netball dresses, bucket hats, warm-up pants"
                  maxLength={LIMITS.garmentsOther}
                  className={inputClass}
                  aria-invalid={p.invalid}
                  aria-describedby={p.describedBy}
                  required={garmentIsOther}
                />
              )}
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-[18px] sm:grid-cols-3">
          <Field label="Sport / group type" name="sport" required error={errors.sport}>
            {(p) => (
              <select
                id={p.id}
                name="sport"
                className={inputClass}
                defaultValue=""
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                onChange={(e) => {
                  const other = e.target.value === SPORT_OTHER;
                  setSportIsOther(other);
                  if (other) setLive('Extra field shown: Which sport or group?');
                }}
                required
              >
                <option value="" disabled>
                  Choose…
                </option>
                {sports.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
                <option value={SPORT_OTHER}>{SPORT_OTHER}</option>
              </select>
            )}
          </Field>
          <Field label="Approx. quantity" name="quantity" required error={errors.quantity}>
            {(p) => (
              <select
                id={p.id}
                name="quantity"
                className={inputClass}
                defaultValue=""
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required
              >
                <option value="" disabled>
                  Choose…
                </option>
                {quantities.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Needed by" name="neededBy" error={errors.neededBy}>
            {(p) => (
              <input
                id={p.id}
                name="neededBy"
                type="text"
                placeholder="e.g. March 2027"
                maxLength={LIMITS.neededBy}
                className={inputClass}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
              />
            )}
          </Field>
        </div>

        <div id="f-sportOther-wrap" className="mt-[18px]" hidden={!sportIsOther}>
          <Field label="Which sport or group?" name="sportOther" required error={errors.sportOther}>
            {(p) => (
              <input
                id={p.id}
                name="sportOther"
                type="text"
                placeholder="e.g. hockey, waka ama, school sports academy, or several sports"
                maxLength={LIMITS.sportOther}
                className={inputClass}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
                required={sportIsOther}
              />
            )}
          </Field>
        </div>

        <div className="mt-[18px]">
          <Field label="Anything else we should know?" name="notes" error={errors.notes}>
            {(p) => (
              <textarea
                id={p.id}
                name="notes"
                rows={4}
                placeholder="Colours, sponsors, competition uniform rules, a design you've seen and liked…"
                maxLength={LIMITS.notes}
                className={`${inputClass} min-h-[96px] resize-y leading-[1.5]`}
                aria-invalid={p.invalid}
                aria-describedby={p.describedBy}
              />
            )}
          </Field>
        </div>

        <div className="mt-[18px]">
          <label htmlFor="f-artwork" className="field-label mb-[7px] block">
            Logo or artwork
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              'hatch flex min-h-[104px] flex-col items-center justify-center gap-2 border border-dashed bg-plum-700 px-4 py-5 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime',
              dragging ? 'border-lime bg-plum-650' : 'border-white/[0.26]',
            ].join(' ')}
          >
            <p id="f-artwork-hint" className="text-[14.5px] text-white/60">
              Drop your logo or artwork here — PNG, JPG, PDF, AI, EPS, SVG or ZIP
            </p>
            <input
              ref={fileInput}
              id="f-artwork"
              type="file"
              name="artwork"
              multiple
              accept={ARTWORK_ACCEPT}
              className="sr-only"
              aria-describedby={artworkDescribedBy}
              aria-invalid={Boolean(errors.artwork)}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <label htmlFor="f-artwork" className="link-lime cursor-pointer">
              Choose files
            </label>
            <p id="f-artwork-limit" className="text-[12px] text-white/60">
              Up to {ARTWORK_MAX_FILES} files, {formatBytes(ARTWORK_MAX_TOTAL_BYTES)} total
            </p>
          </div>
          {files.length > 0 && (
            <ul className="mt-3 grid gap-2" aria-label="Selected files">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}`}
                  className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px]"
                >
                  <span className="truncate text-white/85">
                    {f.name} <span className="text-white/60">· {formatBytes(f.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-[12px] font-bold uppercase tracking-[0.08em] text-lime hover:text-lime-soft"
                    aria-label={`Remove ${f.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
              <li className="text-[12px] text-white/60">{formatBytes(totalBytes)} selected</li>
            </ul>
          )}
          {errors.artwork && (
            <p id="f-artwork-error" className="field-error mt-2">
              {errors.artwork}
            </p>
          )}
        </div>

        {turnstileSiteKey && (
          <div className="mt-6">
            <Turnstile siteKey={turnstileSiteKey} action="quote" />
          </div>
        )}

        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[340px] text-[13px] leading-[1.5] text-white/60">
            We'll only use your details to prepare your quote. No spam, no reselling. See our{' '}
            <a href="/policies/privacy" className="link-inline">
              privacy policy
            </a>
            .
          </p>
          <button type="submit" className="btn btn-primary" aria-disabled={submitting}>
            {submitting ? (
              'Sending…'
            ) : (
              <>
                Send quote request <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-5 text-[13px] text-white/60">
          Prefer to talk it through? Call{' '}
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="link-inline">
            {phone}
          </a>
          .
        </p>
      </form>
    </>
  );
}
