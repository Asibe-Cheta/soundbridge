import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AgreementClient } from './AgreementClient';

export const metadata: Metadata = {
  title: 'Digital Rights & Content Ownership Agreement',
  description:
    'Model agreement on creator ownership of content and the platform licence, aligned with the SoundBridge legal draft. Draft — for counsel review. Shared directly by SoundBridge.',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ draft?: string; edit?: string }>;
};

export default async function AgreementPage({ searchParams }: PageProps) {
  const { draft, edit } = await searchParams;

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
        <AgreementClient initialDraftId={draft} initialEditToken={edit} />
      </div>
    </div>
  );
}
