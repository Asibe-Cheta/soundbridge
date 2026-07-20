'use client';

import Image from 'next/image';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const PERKS = [
  '1 year of SoundBridge Premium, free, on us',
  '10% commission on every paid subscription from someone who joins through your referral link',
];

const EXPECTATIONS = [
  'Share your referral link honestly — no spam, and no misleading claims about SoundBridge',
  'Use the same email below as (or sign up with it for) your SoundBridge account, since that’s the account your perks are applied to',
  'Follow the normal SoundBridge community and platform policies',
];

const HOW_IT_WORKS = [
  'Sign below with your name and email',
  'Justice reviews your application and provisions your account',
  'You get a unique referral link and your 1 year Premium access activates',
  'Commission is tracked automatically as your referrals convert to paid plans, and is paid out manually — you can check your running total any time from your Partner Dashboard',
];

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PartnerAgreementClient() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [context, setContext] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<{ name: string; date: string } | null>(null);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSign = fullName.trim().length > 1 && isValidEmail(email) && agreed && !submitting;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSign) return;
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not submit your application. Please try again.');
        return;
      }
      setSigned({ name: fullName.trim(), date: todayLabel() });
    } catch {
      setError('Could not submit your application. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (signed) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Thanks {signed.name.split(' ')[0]}, your application is in!
          </h1>
          <p className="mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Justice will review it and email your referral link once it&apos;s approved. If you
            don&apos;t have a SoundBridge account under this email yet, sign up now so it&apos;s
            ready to go.
          </p>

          <div className="mt-8 w-full max-w-xs rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-5 py-4">
            <p className="font-serif text-2xl italic">{signed.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              Signed {signed.date}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-8 w-full max-w-xs rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-semibold transition hover:bg-[hsl(var(--muted))] print:hidden"
          >
            Save / print confirmation
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">SoundBridge Partner Programme</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          Become a SoundBridge referral partner. Read the terms below and sign at the bottom to
          apply.
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
            What we ask of you
          </h2>
          <ul className="space-y-2.5">
            {EXPECTATIONS.map((item) => (
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
          <span className="font-medium text-[hsl(var(--foreground))]">Before you sign — </span>
          this isn&apos;t a legally binding employment or agency contract. SoundBridge may adjust
          or end the partner programme at any time; commission already earned on converted
          referrals up to that point will still be honoured.
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
          {submitting ? 'Submitting…' : 'Sign & Apply'}
        </button>
      </form>
    </article>
  );
}
