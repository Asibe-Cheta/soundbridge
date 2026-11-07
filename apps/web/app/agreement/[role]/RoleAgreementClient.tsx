'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle2 } from 'lucide-react';
import { renderAgreementText } from '@/src/lib/role-agreement-text';

interface RoleAgreementClientProps {
  slug: string;
  roleTitle: string;
  defaultSignerName: string;
  agreementVersion: string;
  isAdmin: boolean;
  adminName: string | null;
  signerEmail: string | null;
  signerSignaturePng: string | null;
  signerAgreedAt: string | null;
  adminSignedBy: string | null;
  adminSignaturePng: string | null;
  adminSignedAt: string | null;
  referenceId: string;
}

type SignerState = {
  name: string;
  email: string;
  signaturePng: string;
  agreedAt: string;
};

type AdminSignState = {
  signedBy: string;
  signaturePng: string;
  signedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
}

function isValidName(value: string) {
  return value.trim().length >= 2;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function localStorageKey(slug: string) {
  return `role-agreement-signer-${slug}`;
}

function readStoredSignerState(slug: string): SignerState | null {
  try {
    const raw = window.localStorage.getItem(localStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.agreedAt === 'string' && typeof parsed.signaturePng === 'string') {
      return parsed as SignerState;
    }
    return null;
  } catch {
    return null;
  }
}

function storeSignerState(slug: string, state: SignerState) {
  try {
    window.localStorage.setItem(localStorageKey(slug), JSON.stringify(state));
  } catch {
    /* best-effort only — if storage is unavailable, the signer just won't see
       the full detail again on this device after a reload. Not fatal. */
  }
}

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${origin}/images/logos/logo-trans-lockup.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function RoleAgreementClient({
  slug,
  roleTitle,
  defaultSignerName,
  agreementVersion,
  isAdmin,
  adminName,
  signerEmail: initialSignerEmail,
  signerSignaturePng: initialSignerSignaturePng,
  signerAgreedAt: initialSignerAgreedAt,
  adminSignedBy: initialAdminSignedBy,
  adminSignaturePng: initialAdminSignaturePng,
  adminSignedAt: initialAdminSignedAt,
  referenceId,
}: RoleAgreementClientProps) {
  const agreementText = renderAgreementText(roleTitle, defaultSignerName);

  const [signer, setSigner] = useState<SignerState | null>(
    initialSignerAgreedAt && initialSignerSignaturePng
      ? {
          name: defaultSignerName,
          email: initialSignerEmail || '',
          signaturePng: initialSignerSignaturePng,
          agreedAt: initialSignerAgreedAt,
        }
      : null,
  );
  const [adminSign, setAdminSign] = useState<AdminSignState | null>(
    initialAdminSignedAt && initialAdminSignaturePng
      ? { signedBy: initialAdminSignedBy || 'SoundBridge Admin', signaturePng: initialAdminSignaturePng, signedAt: initialAdminSignedAt }
      : null,
  );

  // Whether THIS browser is the one that originally signed — the only way a
  // non-admin visitor sees full signer detail on a later visit, since
  // volunteers don't log in to sign this agreement.
  const [isSignerDevice, setIsSignerDevice] = useState(false);

  useEffect(() => {
    const stored = readStoredSignerState(slug);
    if (stored) {
      setIsSignerDevice(true);
      // Prefer server state (authoritative) but fall back to local copy for
      // email, which the server also returns, so this mostly just confirms.
      setSigner((prev) => prev ?? stored);
    }
  }, [slug]);

  const fullDetailAllowed = isAdmin || isSignerDevice;

  // --- Signer form state ---
  const sigRef = useRef<SignatureCanvas>(null);
  const [padWidth, setPadWidth] = useState(320);
  const [hasSignature, setHasSignature] = useState(false);
  const [fullName, setFullName] = useState(defaultSignerName);
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = Math.min(480, Math.max(260, window.innerWidth - 96));
    setPadWidth(w);
  }, []);

  const clearSignature = useCallback(() => {
    sigRef.current?.clear();
    setHasSignature(false);
  }, []);

  const canSign = isValidName(fullName) && isValidEmail(email) && agreed && hasSignature && !submitting;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSign) return;
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('Please draw your signature before signing.');
      return;
    }
    const signaturePng = sigRef.current.toDataURL('image/png');

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agreement/role/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), agreed: true, signaturePng }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Deliberately do not clear the signature pad or form fields on
        // failure — the volunteer shouldn't have to redraw their signature.
        setError(data?.error || 'Could not sign. Please try again.');
        return;
      }
      const newState: SignerState = {
        name: data.signerName,
        email: data.signerEmail,
        signaturePng: data.signerSignaturePng,
        agreedAt: data.signerAgreedAt,
      };
      setSigner(newState);
      storeSignerState(slug, newState);
      setIsSignerDevice(true);
    } catch {
      setError('Could not sign. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Admin countersign form state ---
  const adminSigRef = useRef<SignatureCanvas>(null);
  const [adminHasSignature, setAdminHasSignature] = useState(false);
  const [adminSignedByName, setAdminSignedByName] = useState(adminName || '');
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const clearAdminSignature = useCallback(() => {
    adminSigRef.current?.clear();
    setAdminHasSignature(false);
  }, []);

  const canCountersign = isValidName(adminSignedByName) && adminHasSignature && !adminSubmitting;

  const handleCountersign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCountersign) return;
    if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
      setAdminError('Please draw your signature before countersigning.');
      return;
    }
    const signaturePng = adminSigRef.current.toDataURL('image/png');

    setAdminSubmitting(true);
    setAdminError(null);
    try {
      const res = await fetch(`/api/agreement/role/${slug}/countersign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedByName: adminSignedByName.trim(), signaturePng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data?.error || 'Could not countersign. Please try again.');
        return;
      }
      setAdminSign({
        signedBy: data.adminSignedBy,
        signaturePng: data.adminSignaturePng,
        signedAt: data.adminSignedAt,
      });
    } catch {
      setAdminError('Could not countersign. Check your connection and try again.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  // --- PDF generation (includes both signatures once present) ---
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!signer) return;
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = margin;

      const logoData = await fetchLogoDataUrl();
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', margin, y, 42, 12);
          y += 14;
        } catch {
          /* optional logo */
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`Volunteer Agreement: ${roleTitle}`, margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Version: ${agreementVersion}  ·  Reference: ${referenceId}`, margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const bodyText = renderAgreementText(roleTitle, signer.name);
      const bodyLines = doc.splitTextToSize(bodyText, pageW - margin * 2);
      for (const line of bodyLines) {
        if (y > pageH - 28) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5;
      }

      y += 4;
      if (y > pageH - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Signed by the volunteer', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${signer.name}`, margin, y);
      y += 5;
      doc.text(`Date: ${formatDateTime(signer.agreedAt)}`, margin, y);
      y += 8;

      if (y > pageH - 45) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(signer.signaturePng, 'PNG', margin, y, 72, 28);
      y += 28 + 10;

      if (adminSign) {
        if (y > pageH - 60) {
          doc.addPage();
          y = margin;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Countersigned for SoundBridge Live Ltd', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${adminSign.signedBy}`, margin, y);
        y += 5;
        doc.text(`Date: ${formatDateTime(adminSign.signedAt)}`, margin, y);
        y += 8;

        if (y > pageH - 45) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(adminSign.signaturePng, 'PNG', margin, y, 72, 28);
        y += 28 + 10;
      }

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const footer = doc.splitTextToSize(
        'This document was generated in the SoundBridge product.',
        pageW - margin * 2,
      );
      for (const line of footer) {
        if (y > pageH - 12) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4;
      }

      doc.save(`SoundBridge-${roleTitle.replace(/\s+/g, '-')}-Agreement-${referenceId}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Could not generate PDF. Please try again or use a different browser.');
    } finally {
      setGenerating(false);
    }
  }, [signer, adminSign, roleTitle, agreementVersion, referenceId]);

  // --- Render ---

  const hasSigned = !!signer;
  const hasCountersigned = !!adminSign;

  return (
    <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
      <header className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/logos/logo-trans-lockup.png"
            alt="SoundBridge"
            width={180}
            height={48}
            className="h-10 w-auto"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Volunteer Agreement: {roleTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          {hasSigned
            ? 'This agreement has been signed.'
            : 'Please read the agreement below, then sign at the bottom to confirm you agree.'}
        </p>

        {!hasSigned && (
          <div className="mx-auto mt-5 flex max-w-xs items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-3 text-left">
            <img
              src="/images/team/justice-asibe.jpg"
              alt="Justice Asibe"
              className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
            />
            <div className="text-sm">
              <p className="font-medium">Justice Asibe</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Founder, SoundBridge</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <p className="mx-auto mt-4 max-w-xs rounded-lg border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary))]">
            Admin view
          </p>
        )}
      </header>

      <section className="space-y-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Agreement — version {agreementVersion}
          </h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]">
            {agreementText}
          </div>
        </div>
      </section>

      {/* Status summary: what every visitor sees, regardless of admin/signer access */}
      <section className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-4 text-sm">
        <p className="font-medium">
          {hasSigned
            ? hasCountersigned
              ? 'Signed by the volunteer and countersigned by SoundBridge.'
              : 'Signed by the volunteer. Awaiting SoundBridge countersignature.'
            : 'Not yet signed.'}
        </p>
        {fullDetailAllowed && hasSigned && (
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">
            Signed by {signer!.name} on {formatDate(signer!.agreedAt)}.
          </p>
        )}
        {fullDetailAllowed && hasCountersigned && (
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">
            Countersigned by {adminSign!.signedBy} on {formatDate(adminSign!.signedAt)}.
          </p>
        )}
      </section>

      {/* Full detail: admin, or the device that originally signed */}
      {fullDetailAllowed && hasSigned && (
        <section className="mt-6 space-y-5">
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
                <CheckCircle2 className="h-6 w-6 text-[hsl(var(--primary-foreground))]" />
              </div>
              <img src={signer!.signaturePng} alt="Signature" className="h-16 object-contain" />
              <p className="mt-2 font-medium">{signer!.name}</p>
              {isAdmin && <p className="text-xs text-[hsl(var(--muted-foreground))]">{signer!.email}</p>}
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Signed {formatDateTime(signer!.agreedAt)}
              </p>
            </div>
          </div>

          {hasCountersigned && (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4">
              <div className="flex flex-col items-center text-center">
                <img src={adminSign!.signaturePng} alt="Countersignature" className="h-16 object-contain" />
                <p className="mt-2 font-medium">{adminSign!.signedBy}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">SoundBridge Live Ltd</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  Countersigned {formatDateTime(adminSign!.signedAt)}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generating}
              className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? 'Preparing PDF...' : 'Download signed PDF'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generating}
              className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-semibold transition hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save a copy
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      {/* Volunteer sign form — only while unsigned, and never for an admin
          (admins countersign below; they shouldn't submit the volunteer's
          own signature on their behalf) */}
      {!hasSigned && !isAdmin && (
        <form onSubmit={handleSign} className="mt-8 space-y-4 border-t border-[hsl(var(--border))] pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Sign this agreement
          </h2>

          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Full name</span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Email address</span>
            <input
              type="email"
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Your signature</p>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
              <SignatureCanvas
                ref={sigRef}
                penColor="#111827"
                onEnd={() => setHasSignature(true)}
                canvasProps={{
                  width: padWidth,
                  height: 140,
                  className: 'block max-w-full touch-none',
                }}
              />
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[hsl(var(--muted-foreground))]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
            />
            I have read and agree to the above, and I confirm my employer allows outside volunteer work.
          </label>

          {error ? (
            <p
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSign}
            className="w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Signing...' : 'Sign agreement'}
          </button>
        </form>
      )}

      {/* Admin countersign form — only for admins, once the volunteer has signed and admin hasn't yet */}
      {isAdmin && hasSigned && !hasCountersigned && (
        <form onSubmit={handleCountersign} className="mt-8 space-y-4 border-t border-[hsl(var(--border))] pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Countersign for SoundBridge Live Ltd
          </h2>

          <label className="block text-sm">
            <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Your name</span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))]"
              value={adminSignedByName}
              onChange={(e) => setAdminSignedByName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Your signature</p>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
              <SignatureCanvas
                ref={adminSigRef}
                penColor="#111827"
                onEnd={() => setAdminHasSignature(true)}
                canvasProps={{
                  width: padWidth,
                  height: 140,
                  className: 'block max-w-full touch-none',
                }}
              />
            </div>
            <button
              type="button"
              onClick={clearAdminSignature}
              className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          </div>

          {adminError ? (
            <p
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200"
              role="alert"
            >
              {adminError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canCountersign}
            className="w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {adminSubmitting ? 'Countersigning...' : 'Countersign agreement'}
          </button>
        </form>
      )}
    </article>
  );
}
