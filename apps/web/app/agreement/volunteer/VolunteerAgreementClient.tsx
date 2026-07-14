'use client';

import Image from 'next/image';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const EXPECTATIONS = [
  'Show up reliably for your agreed hours each week',
  "Communicate early if you're stuck, unsure, or can't meet a deadline — rather than going quiet",
  'Take ownership of tasks you’re given and see them through',
  'Bring your own ideas, and push back respectfully if you disagree with something',
  'Keep any non-public information about SoundBridge confidential',
];

const COMMITMENTS = [
  "Clear tasks and context for the work you're doing",
  'Regular check-ins and feedback',
  'Real product management experience and mentorship',
  'Credit for your contributions',
];

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function VolunteerAgreementClient() {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState<{ name: string; date: string } | null>(null);

  const canSign = name.trim().length > 1 && agreed;

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSign) return;
    setSigned({ name: name.trim(), date: todayLabel() });
  };

  if (signed) {
    return (
      <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm sm:p-8">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Thanks {signed.name.split(' ')[0]}, you&apos;re all signed up!
          </h1>
          <p className="mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Justice will be in touch. Welcome to SoundBridge — glad to have you on the team.
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Volunteer Agreement</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
          Hi! Before you get started with SoundBridge, we just want to make sure we&apos;re on
          the same page about what this role involves. Please read through this, and if
          you&apos;re happy with it, sign at the bottom.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Your role
          </h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b border-[hsl(var(--border))] pb-2">
              <dt className="text-[hsl(var(--muted-foreground))]">Position</dt>
              <dd className="font-medium">Product Manager (Volunteer)</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <dt className="text-[hsl(var(--muted-foreground))]">Time commitment</dt>
              <dd className="font-medium">~20 hours / week</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            This is a volunteer / internship role — unpaid, and focused on giving you real
            product experience while helping SoundBridge grow.
          </p>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            What we expect from you
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
            What you can expect from us
          </h2>
          <ul className="space-y-2.5">
            {COMMITMENTS.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
          <span className="font-medium text-[hsl(var(--foreground))]">Before you sign — </span>
          this isn&apos;t a legally binding employment contract. It&apos;s simply an agreement
          between us so expectations are clear on both sides.
        </p>
      </section>

      <form onSubmit={handleSign} className="mt-8 space-y-4 border-t border-[hsl(var(--border))] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Sign the agreement
        </h2>

        <label className="block text-sm">
          <span className="mb-1 block text-[hsl(var(--muted-foreground))]">
            Type your full name to sign
          </span>
          <input
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 font-serif text-base italic"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Osas Iyamu"
            autoComplete="name"
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

        <button
          type="submit"
          disabled={!canSign}
          className="w-full rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sign Agreement
        </button>
      </form>
    </article>
  );
}
