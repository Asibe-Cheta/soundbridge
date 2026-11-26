'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

type ViewResponse = {
  partnerName: string;
  agreementText: string;
  status: 'viewed' | 'signed';
  signedAt: string | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'rate_limited' }
  | { kind: 'ready'; data: ViewResponse }
  | { kind: 'signed'; partnerName: string; signedAt: string };

export function SignAgreementClient({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [padWidth, setPadWidth] = useState(320);
  const sigRef = useRef<SignatureCanvas>(null);

  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [signerEntity, setSignerEntity] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const w = Math.min(520, Math.max(260, window.innerWidth - 48));
    setPadWidth(w);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agreements/${token}`);
        if (res.status === 429) {
          if (!cancelled) setState({ kind: 'rate_limited' });
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setState({ kind: 'invalid' });
          return;
        }
        if (cancelled) return;
        if (data.status === 'signed' && data.signedAt) {
          setState({ kind: 'signed', partnerName: data.partnerName, signedAt: data.signedAt });
        } else {
          setState({ kind: 'ready', data: data as ViewResponse });
        }
      } catch {
        if (!cancelled) setState({ kind: 'invalid' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleClearSignature = useCallback(() => {
    sigRef.current?.clear();
    setHasSignature(false);
  }, []);

  const canSign =
    signerName.trim().length > 0 &&
    signerRole.trim().length > 0 &&
    signerEntity.trim().length > 0 &&
    agreed &&
    hasSignature &&
    !submitting;

  const handleSign = useCallback(async () => {
    if (!canSign || !sigRef.current) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const signatureImage = sigRef.current.toDataURL('image/png');
      const res = await fetch(`/api/agreements/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerRole: signerRole.trim(),
          signerEntity: signerEntity.trim(),
          agreed,
          signatureImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'already_signed' || data.error === 'revoked' || data.error === 'expired' || data.error === 'invalid') {
          setState({ kind: 'invalid' });
          return;
        }
        setSubmitError(data.error || 'Could not sign. Please try again.');
        return;
      }
      setState({ kind: 'signed', partnerName: '', signedAt: new Date().toISOString() });
    } catch {
      setSubmitError('Could not sign. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSign, token, signerName, signerRole, signerEntity, agreed]);

  if (state.kind === 'loading') {
    return (
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading…
      </div>
    );
  }

  if (state.kind === 'invalid') {
    return (
      <div className="motion-safe:animate-fade-in rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
        <p className="text-sm text-[hsl(var(--foreground))]">
          This link isn&apos;t available. It may be invalid, expired, or already used.
        </p>
      </div>
    );
  }

  if (state.kind === 'rate_limited') {
    return (
      <div className="motion-safe:animate-fade-in rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
        <p className="text-sm text-[hsl(var(--foreground))]">Too many requests. Please wait a moment and try again.</p>
      </div>
    );
  }

  if (state.kind === 'signed') {
    return (
      <article className="motion-safe:animate-slide-up rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold">Signed</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          This agreement was signed on {new Date(state.signedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}.
        </p>
        <a
          href={`/api/agreements/${token}/pdf`}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
        >
          Download PDF
        </a>
      </article>
    );
  }

  const { data } = state;

  return (
    <article className="motion-safe:animate-fade-in space-y-6">
      <header className="text-center">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Partnership agreement: SoundBridge Live Ltd and {data.partnerName}
        </h1>
      </header>

      <section
        className="max-h-80 overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-sm leading-relaxed text-[hsl(var(--foreground))] shadow-sm"
        aria-label="Agreement text"
      >
        {data.agreementText.split(/\n\s*\n/).map((para, i) => (
          <p key={i} className="mb-3 whitespace-pre-wrap last:mb-0">
            {para}
          </p>
        ))}
      </section>

      <section className="motion-safe:animate-slide-up space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-6">
        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Full legal name</span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))]"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Role</span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))]"
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              placeholder="e.g. Director"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">
              Company or trading name (and company number, if registered)
            </span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))]"
              value={signerEntity}
              onChange={(e) => setSignerEntity(e.target.value)}
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>I have read and agree to this agreement.</span>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Signature</p>
          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
            <SignatureCanvas
              ref={sigRef}
              penColor="#111827"
              canvasProps={{ width: padWidth, height: 140, className: 'block max-w-full touch-none' }}
              onEnd={() => setHasSignature(!sigRef.current?.isEmpty())}
            />
          </div>
          <button
            type="button"
            onClick={handleClearSignature}
            className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
          >
            Clear
          </button>
        </div>

        <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
          By signing, we record your name, role, company/trading name, signature image, the date and time, your IP
          address, and your browser details, to verify and keep evidence of this agreement.
        </p>

        {submitError ? (
          <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200" role="alert">
            {submitError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSign}
          disabled={!canSign}
          className="w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing…' : 'Sign'}
        </button>
      </section>
    </article>
  );
}
