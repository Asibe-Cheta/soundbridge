'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { AGREEMENT_BODY } from './agreementLegalText';

const SB_DEFAULTS = {
  companyName: 'SoundBridge Live Ltd',
  representativeName: 'Justice Chetachukwu Asibe',
  title: 'Founder and CEO',
} as const;

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
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

export function AgreementClient() {
  const sbSigRef = useRef<SignatureCanvas>(null);
  const creatorSigRef = useRef<SignatureCanvas>(null);

  const [padWidth, setPadWidth] = useState(320);

  const [sbCompany, setSbCompany] = useState(SB_DEFAULTS.companyName);
  const [sbRep, setSbRep] = useState(SB_DEFAULTS.representativeName);
  const [sbTitle, setSbTitle] = useState(SB_DEFAULTS.title);
  const [sbDate, setSbDate] = useState('');

  const [creatorName, setCreatorName] = useState('');
  const [creatorArtist, setCreatorArtist] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorDate, setCreatorDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSbDate(today);
    setCreatorDate(today);
  }, []);

  useEffect(() => {
    const w = Math.min(520, Math.max(260, window.innerWidth - 48));
    setPadWidth(w);
  }, []);

  const clearSb = useCallback(() => sbSigRef.current?.clear(), []);
  const clearCreator = useCallback(() => creatorSigRef.current?.clear(), []);

  const handleDownloadPdf = useCallback(async () => {
    setError(null);
    setSuccess(false);

    if (!creatorName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!creatorEmail.trim() || !isValidEmail(creatorEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!creatorArtist.trim()) {
      setError('Please enter your artist / project or company name.');
      return;
    }
    if (!sbDate || !creatorDate) {
      setError('Please set both signature dates.');
      return;
    }
    if (sbSigRef.current?.isEmpty()) {
      setError('SoundBridge representative signature is required.');
      return;
    }
    if (creatorSigRef.current?.isEmpty()) {
      setError('Your signature is required.');
      return;
    }

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
      doc.text('Digital Rights & Content Ownership Agreement', margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const refId = `SBR-${Date.now()}-${slugify(creatorName) || 'creator'}`;
      doc.text(`Reference: ${refId}`, margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

      const bodyLines = doc.splitTextToSize(AGREEMENT_BODY, pageW - margin * 2);
      doc.setFontSize(10);
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
      doc.text('Particulars recorded at signing', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const partyBlock = [
        `SoundBridge: ${sbCompany}`,
        `Representative: ${sbRep}`,
        `Title: ${sbTitle}`,
        `Date: ${sbDate}`,
        '',
        `Creator legal name: ${creatorName.trim()}`,
        `Artist / project or company: ${creatorArtist.trim()}`,
        `Email: ${creatorEmail.trim()}`,
        `Date: ${creatorDate}`,
      ];
      for (const row of partyBlock) {
        if (y > pageH - 40) {
          doc.addPage();
          y = margin;
        }
        doc.text(row, margin, y);
        y += 5;
      }

      y += 4;
      if (y > pageH - 52) {
        doc.addPage();
        y = margin;
      }

      const sbImg = sbSigRef.current!.toDataURL('image/png');
      const crImg = creatorSigRef.current!.toDataURL('image/png');
      const sigW = 72;
      const sigH = 28;

      doc.setFont('helvetica', 'bold');
      doc.text('SoundBridge representative', margin, y);
      y += 5;
      doc.addImage(sbImg, 'PNG', margin, y, sigW, sigH);
      y += sigH + 8;

      if (y > pageH - 40) {
        doc.addPage();
        y = margin;
      }
      doc.text('Creator', margin, y);
      y += 5;
      doc.addImage(crImg, 'PNG', margin, y, sigW, sigH);
      y += sigH + 10;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const footer = doc.splitTextToSize(
        'This document was generated in the SoundBridge product. For general platform terms see soundbridge.live/legal/terms and soundbridge.live/legal/privacy.',
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

      doc.save(`SoundBridge-Digital-Rights-Ownership-Agreement-${refId}.pdf`);
      setSuccess(true);
    } catch (e) {
      console.error(e);
      setError('Could not generate PDF. Please try again or use a different browser.');
    } finally {
      setGenerating(false);
    }
  }, [
    creatorArtist,
    creatorDate,
    creatorEmail,
    creatorName,
    sbCompany,
    sbDate,
    sbRep,
    sbTitle,
  ]);

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
          Digital Rights & Content Ownership Agreement
        </h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Between SoundBridge Live Ltd and you, the creator. Complete the fields below, sign, then
          download your PDF copy.
        </p>
      </header>

      <section
        className="mb-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 text-sm leading-relaxed text-[hsl(var(--foreground))] sm:p-5"
        aria-label="Agreement text"
      >
        {AGREEMENT_BODY.split('\n\n').map((para, i) => (
          <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">
            {para}
          </p>
        ))}
        <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
          This page supplements our{' '}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-[hsl(var(--foreground))]">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-[hsl(var(--foreground))]">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-6" aria-label="Agreement form">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            SoundBridge (pre-filled)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Company</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={sbCompany}
                onChange={(e) => setSbCompany(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Representative</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={sbRep}
                onChange={(e) => setSbRep(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Title</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={sbTitle}
                onChange={(e) => setSbTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={sbDate}
                onChange={(e) => setSbDate(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Creator (your details)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Full legal name</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="As on official ID"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">
                Artist / project or company name
              </span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={creatorArtist}
                onChange={(e) => setCreatorArtist(e.target.value)}
                placeholder="How you appear on SoundBridge"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Email</span>
              <input
                type="email"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={creatorDate}
                onChange={(e) => setCreatorDate(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">SoundBridge signature</p>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
              <SignatureCanvas
                ref={sbSigRef}
                penColor="#111827"
                canvasProps={{
                  width: padWidth,
                  height: 140,
                  className: 'block max-w-full touch-none',
                }}
              />
            </div>
            <button
              type="button"
              onClick={clearSb}
              className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Your signature</p>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
              <SignatureCanvas
                ref={creatorSigRef}
                penColor="#111827"
                canvasProps={{
                  width: padWidth,
                  height: 140,
                  className: 'block max-w-full touch-none',
                }}
              />
            </div>
            <button
              type="button"
              onClick={clearCreator}
              className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            PDF downloaded. Keep a copy for your records.
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={generating}
          className="w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? 'Generating PDF…' : 'Download signed PDF'}
        </button>
      </section>
    </article>
  );
}
