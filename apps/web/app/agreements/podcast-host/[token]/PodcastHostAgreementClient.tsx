'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle2 } from 'lucide-react';
import { renderAgreementText } from '@/src/lib/podcast-host-agreement-text';

interface PodcastHostAgreementClientProps {
  token: string;
  agreementVersion: string;
  hostName: string | null;
  signedName: string | null;
  signaturePng: string | null;
  signedAt: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isValidName(value: string) {
  return value.trim().length >= 2;
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

export function PodcastHostAgreementClient({
  token,
  agreementVersion,
  hostName,
  signedName: initialSignedName,
  signaturePng: initialSignaturePng,
  signedAt: initialSignedAt,
}: PodcastHostAgreementClientProps) {
  const agreementText = renderAgreementText(hostName || '');
  const sigRef = useRef<SignatureCanvas>(null);
  const [padWidth, setPadWidth] = useState(320);
  const [hasSignature, setHasSignature] = useState(false);

  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [signed, setSigned] = useState<{ name: string; date: string; signaturePng: string } | null>(
    initialSignedAt && initialSignedName && initialSignaturePng
      ? { name: initialSignedName, date: formatDate(initialSignedAt), signaturePng: initialSignaturePng }
      : null,
  );

  useEffect(() => {
    const w = Math.min(480, Math.max(260, window.innerWidth - 96));
    setPadWidth(w);
  }, []);

  const clearSignature = useCallback(() => {
    sigRef.current?.clear();
    setHasSignature(false);
  }, []);

  const canSign = isValidName(fullName) && agreed && hasSignature && !submitting;

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
      const res = await fetch(`/api/agreements/podcast-host/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), agreed: true, signaturePng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not sign. Please try again.');
        return;
      }
      setSigned({ name: data.signedName, date: formatDate(data.signedAt), signaturePng });
    } catch {
      setError('Could not sign. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!signed) return;
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
      doc.text('Podcast Host Agreement', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Version: ${agreementVersion}`, margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const bodyLines = doc.splitTextToSize(agreementText, pageW - margin * 2);
      for (const line of bodyLines) {
        if (y > pageH - 28) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5;
      }

      y += 4;
      if (y > pageH - 55) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Signed by', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${signed.name}`, margin, y);
      y += 5;
      doc.text(`Date: ${signed.date}`, margin, y);
      y += 8;

      if (y > pageH - 45) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(signed.signaturePng, 'PNG', margin, y, 72, 28);
      y += 28 + 10;

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

      doc.save(`SoundBridge-Podcast-Host-Agreement-${signed.name.replace(/\s+/g, '-')}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Could not generate PDF. Please try again or use a different browser.');
    } finally {
      setGenerating(false);
    }
  }, [signed, agreementVersion, agreementText]);

  if (signed) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Already signed</h1>
          <p className="mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            This agreement was signed on {signed.date} by {signed.name}.
          </p>

          <div className="mt-8 w-full max-w-xs rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-5 py-4">
            <img src={signed.signaturePng} alt="Signature" className="mx-auto h-16 object-contain" />
            <p className="mt-2 font-medium">{signed.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              Signed {signed.date}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={generating}
            className="mt-8 w-full max-w-xs rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Preparing PDF...' : 'Download signed PDF'}
          </button>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
      </article>
    );
  }

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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Podcast Host Agreement</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          Please read the agreement below, then sign at the bottom to confirm you agree.
        </p>

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

        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] px-3 py-2.5 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Date</span>
          <span className="font-medium">{todayLabel()}</span>
        </div>

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
          I have read and agree to this agreement
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
    </article>
  );
}
