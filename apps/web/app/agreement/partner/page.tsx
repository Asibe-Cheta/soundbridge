import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PartnerAgreementClient } from './PartnerAgreementClient';

export const metadata: Metadata = {
  title: 'Partner Programme — SoundBridge',
  description: 'Become a SoundBridge referral partner: 1 year free Premium and 10% commission on referred subscriptions. Read and sign digitally.',
  robots: { index: false, follow: false },
};

export default function PartnerAgreementPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted))] print:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <PartnerAgreementClient />
      </div>
    </div>
  );
}
