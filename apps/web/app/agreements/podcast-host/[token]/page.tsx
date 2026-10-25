import type { Metadata } from 'next';
import { createServiceClient } from '@/src/lib/supabase';
import { AGREEMENT_VERSION } from '@/src/lib/podcast-host-agreement-text';
import { PodcastHostAgreementClient } from './PodcastHostAgreementClient';

export const metadata: Metadata = {
  title: 'Podcast Host Agreement - SoundBridge',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PodcastHostAgreementPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: record } = await supabase
    .from('podcast_host_agreement_signups')
    .select('label, signed_name, signature_png, signed_at, agreement_version')
    .eq('token', token)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {record ? (
          <PodcastHostAgreementClient
            token={token}
            agreementVersion={record.agreement_version || AGREEMENT_VERSION}
            hostName={record.label}
            signedName={record.signed_name}
            signaturePng={record.signature_png}
            signedAt={record.signed_at}
          />
        ) : (
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center sm:p-8">
            <h1 className="text-lg font-semibold">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Please check the link you were sent, or contact SoundBridge if you think this is a mistake.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
