'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { MBG_SONICS_PARTNERSHIP_BODY } from './mbgSonicsPartnershipLegalText';

const SB_DEFAULTS = {
  companyName: 'SoundBridge Live Ltd',
  representativeName: 'Justice Asibe',
  title: 'Founder & CEO',
} as const;

const PARTNER_DEFAULTS = {
  companyName: 'MBG Sonics',
  representativeName: 'Adedamola Favour Isreal',
} as const;

const SAVE_TOKEN_KEY = 'mbg-sonics-agreement-save-token';
const PAGE_URL = 'https://www.soundbridge.live/agreement/mbg-sonics';

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

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
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

function applySignatureToCanvas(ref: React.RefObject<SignatureCanvas | null>, dataUrl: string | null) {
  if (!dataUrl || !ref.current) return;
  try {
    ref.current.fromDataURL(dataUrl, { ratio: 1, width: ref.current.getCanvas().width, height: ref.current.getCanvas().height });
  } catch {
    /* ignore corrupt image */
  }
}

export function MbgSonicsPartnershipClient() {
  const sbSigRef = useRef<SignatureCanvas>(null);
  const partnerSigRef = useRef<SignatureCanvas>(null);

  const [padWidth, setPadWidth] = useState(320);
  const [saveToken, setSaveToken] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [sbCompany, setSbCompany] = useState(SB_DEFAULTS.companyName);
  const [sbRep, setSbRep] = useState(SB_DEFAULTS.representativeName);
  const [sbTitle, setSbTitle] = useState(SB_DEFAULTS.title);
  const [sbDate, setSbDate] = useState('');

  const [partnerName, setPartnerName] = useState(PARTNER_DEFAULTS.representativeName);
  const [partnerCompany, setPartnerCompany] = useState(PARTNER_DEFAULTS.companyName);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerDate, setPartnerDate] = useState('');

  const [sbSignatureStored, setSbSignatureStored] = useState<string | null>(null);
  const [partnerSignatureStored, setPartnerSignatureStored] = useState<string | null>(null);
  const [signaturesApplied, setSignaturesApplied] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const canEditSoundBridge = !sbSignatureStored || !!saveToken;
  const isCounterpartyView = !!sbSignatureStored && !saveToken;

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSbDate((d) => d || today);
    setPartnerDate((d) => d || today);
  }, []);

  useEffect(() => {
    const w = Math.min(520, Math.max(260, window.innerWidth - 48));
    setPadWidth(w);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem(SAVE_TOKEN_KEY);
    if (token) setSaveToken(token);
  }, []);

  const applyPayload = useCallback((p: DraftPayload) => {
    setSbCompany(p.sbCompany || SB_DEFAULTS.companyName);
    setSbRep(p.sbRep || SB_DEFAULTS.representativeName);
    setSbTitle(p.sbTitle || SB_DEFAULTS.title);
    if (p.sbDate) setSbDate(p.sbDate);
    setPartnerName(p.creatorName || PARTNER_DEFAULTS.representativeName);
    setPartnerCompany(p.creatorArtist || PARTNER_DEFAULTS.companyName);
    setPartnerEmail(p.creatorEmail);
    if (p.creatorDate) setPartnerDate(p.creatorDate);
    setSbSignatureStored(p.sbSignaturePng);
    setPartnerSignatureStored(p.creatorSignaturePng);
    setSignaturesApplied(false);
    setHasSavedOnce(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/agreement/mbg-sonics');
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error || 'Could not load saved agreement');
          return;
        }
        if (cancelled) return;
        if (data.payload) {
          applyPayload(data.payload as DraftPayload);
        }
        if (data.updatedAt) setLastSavedAt(data.updatedAt);
      } catch {
        if (!cancelled) setError('Could not load saved agreement');
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  useEffect(() => {
    if (signaturesApplied || loadingDraft) return;
    const t = window.setTimeout(() => {
      applySignatureToCanvas(sbSigRef, sbSignatureStored);
      applySignatureToCanvas(partnerSigRef, partnerSignatureStored);
      setSignaturesApplied(true);
    }, 50);
    return () => window.clearTimeout(t);
  }, [loadingDraft, signaturesApplied, sbSignatureStored, partnerSignatureStored, padWidth]);

  const buildPayload = useCallback((): DraftPayload => {
    const sbPng =
      sbSigRef.current && !sbSigRef.current.isEmpty()
        ? sbSigRef.current.toDataURL('image/png')
        : sbSignatureStored;
    const partnerPng =
      partnerSigRef.current && !partnerSigRef.current.isEmpty()
        ? partnerSigRef.current.toDataURL('image/png')
        : partnerSignatureStored;
    return {
      sbCompany,
      sbRep,
      sbTitle,
      sbDate,
      creatorName: partnerName,
      creatorArtist: partnerCompany,
      creatorEmail: partnerEmail,
      creatorDate: partnerDate,
      sbSignaturePng: sbPng,
      creatorSignaturePng: partnerPng,
    };
  }, [
    sbCompany,
    sbRep,
    sbTitle,
    sbDate,
    partnerName,
    partnerCompany,
    partnerEmail,
    partnerDate,
    sbSignatureStored,
    partnerSignatureStored,
  ]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setLinkCopied(false);

    const payload = buildPayload();
    if (!payload.sbSignaturePng && !hasSavedOnce) {
      setError('Add your SoundBridge signature before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/agreement/mbg-sonics', {
        method: 'PUT',
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

      if (data.saveToken) {
        setSaveToken(data.saveToken);
        sessionStorage.setItem(SAVE_TOKEN_KEY, data.saveToken);
      }

      setSbSignatureStored(payload.sbSignaturePng);
      setPartnerSignatureStored(payload.creatorSignaturePng);
      setHasSavedOnce(true);
      if (data.updatedAt) setLastSavedAt(data.updatedAt);

      setSuccess(
        saveToken || data.saveToken
          ? 'Saved. Send MBG Sonics this page — it always shows the latest version.'
          : 'Saved. Download the PDF once both parties have signed.',
      );
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, saveToken, hasSavedOnce]);

  const copyPageLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError('Could not copy link. Copy the URL from your browser bar.');
    }
  }, []);

  const clearSb = useCallback(() => {
    if (!canEditSoundBridge) return;
    sbSigRef.current?.clear();
    setSbSignatureStored(null);
  }, [canEditSoundBridge]);

  const clearPartner = useCallback(() => {
    partnerSigRef.current?.clear();
    setPartnerSignatureStored(null);
  }, []);

  const getSbSigForPdf = () => {
    if (sbSigRef.current && !sbSigRef.current.isEmpty()) {
      return sbSigRef.current.toDataURL('image/png');
    }
    return sbSignatureStored;
  };

  const getPartnerSigForPdf = () => {
    if (partnerSigRef.current && !partnerSigRef.current.isEmpty()) {
      return partnerSigRef.current.toDataURL('image/png');
    }
    return partnerSignatureStored;
  };

  const handleDownloadPdf = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!partnerName.trim()) {
      setError('Please enter the MBG Sonics representative name.');
      return;
    }
    if (!partnerEmail.trim() || !isValidEmail(partnerEmail)) {
      setError('Please enter a valid email address for MBG Sonics.');
      return;
    }
    if (!partnerCompany.trim()) {
      setError('Please enter the organisation name (MBG Sonics).');
      return;
    }
    if (!sbDate || !partnerDate) {
      setError('Please set both signature dates.');
      return;
    }
    const sbImg = getSbSigForPdf();
    const partnerImg = getPartnerSigForPdf();
    if (!sbImg) {
      setError('SoundBridge representative signature is required.');
      return;
    }
    if (!partnerImg) {
      setError('MBG Sonics signature is required.');
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
      doc.text('Strategic Partnership Agreement', margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SoundBridge Live Ltd & MBG Sonics', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const refId = `SBP-MBG-${Date.now()}-${slugify(partnerCompany) || 'mbg-sonics'}`;
      doc.text(`Reference: ${refId}`, margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

      const bodyLines = doc.splitTextToSize(MBG_SONICS_PARTNERSHIP_BODY, pageW - margin * 2);
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
        `SoundBridge Live Ltd`,
        `Representative: ${sbRep}`,
        `Title: ${sbTitle}`,
        `Date: ${sbDate}`,
        '',
        `${partnerCompany.trim()}`,
        `Representative: ${partnerName.trim()}`,
        `Email: ${partnerEmail.trim()}`,
        `Date: ${partnerDate}`,
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
      doc.text('SoundBridge Live Ltd', margin, y);
      y += 5;
      doc.addImage(sbImg, 'PNG', margin, y, sigW, sigH);
      y += sigH + 8;

      if (y > pageH - 40) {
        doc.addPage();
        y = margin;
      }
      doc.text('MBG Sonics', margin, y);
      y += 5;
      doc.addImage(partnerImg, 'PNG', margin, y, sigW, sigH);
      y += sigH + 10;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const footer = doc.splitTextToSize(
        'This document was generated in the SoundBridge product. For general platform terms see soundbridge.live/legal/terms.',
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

      doc.save(`SoundBridge-MBG-Sonics-Strategic-Partnership-Agreement-${refId}.pdf`);
      setSuccess('PDF downloaded. Keep a copy for your records.');
    } catch (e) {
      console.error(e);
      setError('Could not generate PDF. Please try again or use a different browser.');
    } finally {
      setGenerating(false);
    }
  }, [
    partnerCompany,
    partnerDate,
    partnerEmail,
    partnerName,
    sbDate,
    sbRep,
    sbTitle,
    sbSignatureStored,
    partnerSignatureStored,
  ]);

  if (loadingDraft) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading agreement…
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
        <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          www.soundbridge.live
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          Strategic Partnership Agreement
        </h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {isCounterpartyView
            ? 'SoundBridge has signed. Complete your details and signature below, then save and download the PDF.'
            : 'Complete the fields, sign, and save. MBG Sonics uses this same page to sign — it always shows the latest version.'}
        </p>
        {lastSavedAt ? (
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            Last saved {formatSavedAt(lastSavedAt)}
          </p>
        ) : null}
      </header>

      {hasSavedOnce && sbSignatureStored ? (
        <div className="mb-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 text-sm">
          <p className="font-medium text-[hsl(var(--foreground))]">Page for MBG Sonics</p>
          <p className="mt-1 break-all text-xs text-[hsl(var(--muted-foreground))]">{PAGE_URL}</p>
          <button
            type="button"
            onClick={copyPageLink}
            className="mt-3 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
          >
            {linkCopied ? 'Copied' : 'Copy page link'}
          </button>
        </div>
      ) : null}

      <section
        className="mb-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 text-sm leading-relaxed text-[hsl(var(--foreground))] sm:p-5"
        aria-label="Agreement text"
      >
        {MBG_SONICS_PARTNERSHIP_BODY.split('\n\n').map((para, i) => (
          <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">
            {para}
          </p>
        ))}
      </section>

      <section className="space-y-6" aria-label="Agreement form">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Party A — SoundBridge {canEditSoundBridge ? '(pre-filled)' : '(signed — locked)'}
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
            Party B — MBG Sonics
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Organisation</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={partnerCompany}
                onChange={(e) => setPartnerCompany(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Representative name</span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Email</span>
              <input
                type="email"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="contact@mbgsonics.com"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                value={partnerDate}
                onChange={(e) => setPartnerDate(e.target.value)}
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
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Saved on this page</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">MBG Sonics signature</p>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white">
              <SignatureCanvas
                ref={partnerSigRef}
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
              onClick={clearPartner}
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
          {saving ? 'Saving…' : 'Save'}
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
