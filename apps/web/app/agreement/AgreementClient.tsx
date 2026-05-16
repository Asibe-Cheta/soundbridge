'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { AGREEMENT_BODY } from './agreementLegalText';

const SB_DEFAULTS = {
  companyName: 'SoundBridge Live Ltd',
  representativeName: 'Justice Chetachukwu Asibe',
  title: 'Founder and CEO',
} as const;

type DraftPayload = {
  sbCompany: string;
  sbRep: string;
  sbTitle: string;
  sbDate: string;
  creatorName: string;
  creatorArtist: string;
  creatorEmail: string;
  creatorDate: string;
  sbSignaturePng: string | null;
  creatorSignaturePng: string | null;
};

type AgreementClientProps = {
  initialDraftId?: string;
  initialEditToken?: string;
};

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

function saveTokenStorageKey(draftId: string) {
  return `agreement-save-token-${draftId}`;
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

function applySignatureToCanvas(ref: React.RefObject<SignatureCanvas | null>, dataUrl: string | null) {
  if (!dataUrl || !ref.current) return;
  try {
    ref.current.fromDataURL(dataUrl, { ratio: 1, width: ref.current.getCanvas().width, height: ref.current.getCanvas().height });
  } catch {
    /* ignore corrupt image */
  }
}

export function AgreementClient({ initialDraftId, initialEditToken }: AgreementClientProps) {
  const router = useRouter();
  const sbSigRef = useRef<SignatureCanvas>(null);
  const creatorSigRef = useRef<SignatureCanvas>(null);

  const [padWidth, setPadWidth] = useState(320);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveToken, setSaveToken] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!initialDraftId);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [sbCompany, setSbCompany] = useState(SB_DEFAULTS.companyName);
  const [sbRep, setSbRep] = useState(SB_DEFAULTS.representativeName);
  const [sbTitle, setSbTitle] = useState(SB_DEFAULTS.title);
  const [sbDate, setSbDate] = useState('');

  const [creatorName, setCreatorName] = useState('');
  const [creatorArtist, setCreatorArtist] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorDate, setCreatorDate] = useState('');

  const [sbSignatureStored, setSbSignatureStored] = useState<string | null>(null);
  const [creatorSignatureStored, setCreatorSignatureStored] = useState<string | null>(null);
  const [signaturesApplied, setSignaturesApplied] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const canEditSoundBridge = !sbSignatureStored || !!saveToken;
  const isCounterpartyView = !!draftId && !!sbSignatureStored && !saveToken;

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSbDate((d) => d || today);
    setCreatorDate((d) => d || today);
  }, []);

  useEffect(() => {
    const w = Math.min(520, Math.max(260, window.innerWidth - 48));
    setPadWidth(w);
  }, []);

  const applyPayload = useCallback((p: DraftPayload) => {
    setSbCompany(p.sbCompany || SB_DEFAULTS.companyName);
    setSbRep(p.sbRep || SB_DEFAULTS.representativeName);
    setSbTitle(p.sbTitle || SB_DEFAULTS.title);
    if (p.sbDate) setSbDate(p.sbDate);
    setCreatorName(p.creatorName);
    setCreatorArtist(p.creatorArtist);
    setCreatorEmail(p.creatorEmail);
    if (p.creatorDate) setCreatorDate(p.creatorDate);
    setSbSignatureStored(p.sbSignaturePng);
    setCreatorSignatureStored(p.creatorSignaturePng);
    setSignaturesApplied(false);
  }, []);

  useEffect(() => {
    if (!initialDraftId) {
      setLoadingDraft(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agreement/drafts/${initialDraftId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not load saved agreement');
          return;
        }
        if (cancelled) return;
        setDraftId(data.id);
        applyPayload(data.payload as DraftPayload);

        const tokenFromUrl = initialEditToken?.trim();
        const tokenFromStorage =
          typeof window !== 'undefined'
            ? sessionStorage.getItem(saveTokenStorageKey(data.id))
            : null;
        const token = tokenFromUrl || tokenFromStorage;
        if (token) {
          setSaveToken(token);
          sessionStorage.setItem(saveTokenStorageKey(data.id), token);
          if (tokenFromUrl) {
            router.replace(`/agreement?draft=${data.id}`, { scroll: false });
          }
        }
      } catch {
        if (!cancelled) setError('Could not load saved agreement');
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDraftId, initialEditToken, applyPayload, router]);

  useEffect(() => {
    if (signaturesApplied || loadingDraft) return;
    const t = window.setTimeout(() => {
      applySignatureToCanvas(sbSigRef, sbSignatureStored);
      applySignatureToCanvas(creatorSigRef, creatorSignatureStored);
      setSignaturesApplied(true);
    }, 50);
    return () => window.clearTimeout(t);
  }, [
    loadingDraft,
    signaturesApplied,
    sbSignatureStored,
    creatorSignatureStored,
    padWidth,
  ]);

  const buildPayload = useCallback((): DraftPayload => {
    const sbPng =
      sbSigRef.current && !sbSigRef.current.isEmpty()
        ? sbSigRef.current.toDataURL('image/png')
        : sbSignatureStored;
    const crPng =
      creatorSigRef.current && !creatorSigRef.current.isEmpty()
        ? creatorSigRef.current.toDataURL('image/png')
        : creatorSignatureStored;
    return {
      sbCompany,
      sbRep,
      sbTitle,
      sbDate,
      creatorName,
      creatorArtist,
      creatorEmail,
      creatorDate,
      sbSignaturePng: sbPng,
      creatorSignaturePng: crPng,
    };
  }, [
    sbCompany,
    sbRep,
    sbTitle,
    sbDate,
    creatorName,
    creatorArtist,
    creatorEmail,
    creatorDate,
    sbSignatureStored,
    creatorSignatureStored,
  ]);

  const shareUrl =
    typeof window !== 'undefined' && draftId
      ? `${window.location.origin}/agreement?draft=${draftId}`
      : '';

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setShareCopied(false);

    const payload = buildPayload();
    if (!payload.sbSignaturePng) {
      setError('Add your SoundBridge signature before saving to share.');
      return;
    }

    setSaving(true);
    try {
      if (!draftId) {
        const res = await fetch('/api/agreement/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not save');
          return;
        }
        setDraftId(data.id);
        setSaveToken(data.saveToken);
        sessionStorage.setItem(saveTokenStorageKey(data.id), data.saveToken);
        setSbSignatureStored(payload.sbSignaturePng);
        setCreatorSignatureStored(payload.creatorSignaturePng);
        router.replace(`/agreement?draft=${data.id}`, { scroll: false });
        setSuccess('Saved. Copy the share link below and send it to the other party to sign.');
        return;
      }

      const res = await fetch(`/api/agreement/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveToken: saveToken ?? undefined,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save');
        return;
      }
      setSbSignatureStored(payload.sbSignaturePng);
      setCreatorSignatureStored(payload.creatorSignaturePng);
      setSuccess('Saved. The share link includes your latest signature and details.');
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, draftId, saveToken, router]);

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch {
      setError('Could not copy link. Select and copy the URL from your browser bar.');
    }
  }, [shareUrl]);

  const clearSb = useCallback(() => {
    if (!canEditSoundBridge) return;
    sbSigRef.current?.clear();
    setSbSignatureStored(null);
  }, [canEditSoundBridge]);

  const clearCreator = useCallback(() => {
    creatorSigRef.current?.clear();
    setCreatorSignatureStored(null);
  }, []);

  const getSbSigForPdf = () => {
    if (sbSigRef.current && !sbSigRef.current.isEmpty()) {
      return sbSigRef.current.toDataURL('image/png');
    }
    return sbSignatureStored;
  };

  const getCreatorSigForPdf = () => {
    if (creatorSigRef.current && !creatorSigRef.current.isEmpty()) {
      return creatorSigRef.current.toDataURL('image/png');
    }
    return creatorSignatureStored;
  };

  const handleDownloadPdf = useCallback(async () => {
    setError(null);
    setSuccess(null);

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
    const sbImg = getSbSigForPdf();
    const crImg = getCreatorSigForPdf();
    if (!sbImg) {
      setError('SoundBridge representative signature is required.');
      return;
    }
    if (!crImg) {
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
      setSuccess('PDF downloaded. Keep a copy for your records.');
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
    sbSignatureStored,
    creatorSignatureStored,
  ]);

  if (loadingDraft) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading saved agreement…
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Digital Rights & Content Ownership Agreement
        </h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {isCounterpartyView
            ? 'SoundBridge has signed. Complete your details and signature below, then download the PDF.'
            : 'Complete the fields, sign, save to share a link with the other party, then download the signed PDF.'}
        </p>
      </header>

      {draftId && shareUrl ? (
        <div className="mb-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 text-sm">
          <p className="font-medium text-[hsl(var(--foreground))]">Share link</p>
          <p className="mt-1 break-all text-xs text-[hsl(var(--muted-foreground))]">{shareUrl}</p>
          <button
            type="button"
            onClick={copyShareLink}
            className="mt-3 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
          >
            {shareCopied ? 'Copied' : 'Copy share link'}
          </button>
        </div>
      ) : null}

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
            SoundBridge {canEditSoundBridge ? '(pre-filled)' : '(signed — locked)'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Company</span>
              <input
                disabled={!canEditSoundBridge}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60"
                value={sbCompany}
                onChange={(e) => setSbCompany(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Representative</span>
              <input
                disabled={!canEditSoundBridge}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60"
                value={sbRep}
                onChange={(e) => setSbRep(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Title</span>
              <input
                disabled={!canEditSoundBridge}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60"
                value={sbTitle}
                onChange={(e) => setSbTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Date</span>
              <input
                type="date"
                disabled={!canEditSoundBridge}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60"
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
            <div
              className={`overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white ${!canEditSoundBridge ? 'pointer-events-none' : ''}`}
            >
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
            {canEditSoundBridge ? (
              <button
                type="button"
                onClick={clearSb}
                className="mt-2 text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))]"
              >
                Clear
              </button>
            ) : (
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Saved with this link</p>
            )}
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
            {success}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-semibold transition hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : draftId ? 'Save changes' : 'Save & get share link'}
        </button>

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
