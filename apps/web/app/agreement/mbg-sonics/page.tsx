import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MbgSonicsPartnershipClient } from './MbgSonicsPartnershipClient';

export const metadata: Metadata = {
  title: 'Strategic Partnership Agreement — MBG Sonics',
  description:
    'SoundBridge Live Ltd strategic partnership agreement with MBG Sonics. Sign digitally and download the PDF.',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ draft?: string; edit?: string }>;
};

export default async function MbgSonicsPartnershipPage({ searchParams }: PageProps) {
  const { draft } = await searchParams;
  if (draft) {
    redirect('/agreement/mbg-sonics');
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <MbgSonicsPartnershipClient />
      </div>
    </div>
  );
}
