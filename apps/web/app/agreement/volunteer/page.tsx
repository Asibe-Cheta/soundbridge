import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VolunteerAgreementClient } from './VolunteerAgreementClient';

export const metadata: Metadata = {
  title: 'Volunteer Agreement — SoundBridge',
  description: 'SoundBridge volunteer agreement. Read and sign digitally.',
  robots: { index: false, follow: false },
};

export default function VolunteerAgreementPage() {
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
        <VolunteerAgreementClient />
      </div>
    </div>
  );
}
