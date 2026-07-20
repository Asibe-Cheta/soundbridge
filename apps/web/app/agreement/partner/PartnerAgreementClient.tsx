'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle2 } from 'lucide-react';
import { PARTNER_AGREEMENT_BODY } from './partnerAgreementLegalText';

const PERKS = [
  '1 year of SoundBridge Premium, free, from your sign up date',
  '10% commission on every paid subscription from someone who joins through your referral link, for as long as they remain subscribed',
];

const WHAT_YOU_WILL_DO = [
  'Share your unique referral link with your audience, friends, and community',
  'Help people discover musicians, podcasters, and DJs on SoundBridge',
  'Grow your commission as more people you refer become subscribers',
];

const HOW_IT_WORKS = [
  'Sign below with your name, email, and signature',
  'We review your application within 24 to 48 hours and set up your account',
  'Your unique referral link is activated and your 1 year of Premium access begins',
  'We send you tutorial videos to help you get started, along with your referral link',
  'Track your referrals and commission any time from your Partner Dashboard',
];

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
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

export function PartnerAgreementClient() {
  const sigRef = useRef<SignatureCanvas>(null);
  const [padWidth, setPadWidth] = useState(320);
  const [hasSignature, setHasSignature] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [context, setContext] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [signed, setSigned] = useState<{ name: string; email: string; date: string; signaturePng: string } | null>(
    null
  );

  useEffect(() => {
    const w = Math.min(480, Math.max(260, window.innerWidth - 96));
    setPadWidth(w);
  }, []);

  const clearSignature = useCallback(() => {
    sigRef.current?.clear();
    setHasSignature(false);
  }, []);

  const canSign = fullName.trim().length > 1 && isValidEmail(email) && agreed && hasSignature && !submitting;

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
      const res = await fetch('/api/agreement/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          context: context.trim() || undefined,
          agreed: true,
          signaturePng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not submit your application. Please try again.');
        return;
      }
      setSigned({ name: fullName.trim(), email: email.trim(), date: todayLabel(), signaturePng });
    } catch {
      setError('Could not submit your application. Check your connection and try again.');
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
      doc.text('SoundBridge Partner Agreement', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const refId = `SBP-${Date.now()}-${slugify(signed.name) || 'partner'}`;
      doc.text(`Reference: ${refId}`, margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const bodyLines = doc.splitTextToSize(PARTNER_AGREEMENT_BODY, pageW - margin * 2);
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
      doc.text(`Email: ${signed.email}`, margin, y);
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
        'This document was generated in the SoundBridge product at soundbridge.live/agreement/partner.',
        pageW - margin * 2
      );
      for (const line of footer) {
        if (y > pageH - 12) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4;
      }

      doc.save(`SoundBridge-Partner-Agreement-${refId}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Could not generate PDF. Please try again or use a different browser.');
    } finally {
      setGenerating(false);
    }
  }, [signed]);

  if (signed) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Welcome aboard, {signed.name.split(' ')[0]}!
          </h1>
          <p className="mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            We will review your application within 24 to 48 hours and set up your account. Once
            that is done, we will send you your referral link and links to our tutorial videos to
            help you get started.
          </p>

          <div className="mt-8 w-full max-w-xs rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-5 py-4">
            <img src={signed.signaturePng} alt="Your signature" className="mx-auto h-16 object-contain" />
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
            {generating ? 'Preparing PDF...' : 'Download your signed copy'}
          </button>
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Welcome to the SoundBridge Partner Collaboration Programme
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          We are thrilled to have you join us. From today, you will be using your unique referral
          link to introduce people to incredible independent musicians, podcasters, and DJs. We
          will guide you every step of the way.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            What you get
          </h2>
          <ul className="space-y-2.5">
            {PERKS.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            What you will be doing
          </h2>
          <ul className="space-y-2.5">
            {WHAT_YOU_WILL_DO.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            How it works
          </h2>
          <ol className="space-y-2.5">
            {HOW_IT_WORKS.map((item, i) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-xs font-semibold text-[hsl(var(--primary))]">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <p className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
          <span className="font-medium text-[hsl(var(--foreground))]">Before you sign: </span>
          this is a binding agreement between you and SoundBridge Live Ltd. It guarantees your 1
          year of Premium access from your sign up date, and your 10% commission for every user
          who joins through your referral link and subscribes, for as long as they remain
          subscribed.
        </p>
      </section>

      <form onSubmit={handleSign} className="mt-8 space-y-4 border-t border-[hsl(var(--border))] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Apply &amp; sign
        </h2>

        <label className="block text-sm">
          <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Full name</span>
          <input
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Dan Edmund"
            autoComplete="name"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[hsl(var(--muted-foreground))]">
            Email (your SoundBridge account email)
          </span>
          <input
            type="email"
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[hsl(var(--muted-foreground))]">Phone (optional)</span>
          <input
            type="tel"
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-[hsl(var(--muted-foreground))]">
            How do you plan to share SoundBridge? (optional)
          </span>
          <textarea
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
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
          I have read and agree to the above
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
          {submitting ? 'Submitting...' : 'Sign & Apply'}
        </button>
      </form>
    </article>
  );
}
