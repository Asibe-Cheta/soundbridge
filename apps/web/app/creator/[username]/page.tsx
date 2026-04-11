import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServiceClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';
import { CreatorProfileClient } from './CreatorProfileClient';

interface CreatorPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username: slug } = await params;
  const headerList = await headers();
  const fromAtShare = headerList.get('x-sb-open-app-banner') === '1';

  const supabase = createServiceClient();
  const decodedSlug = decodeURIComponent(slug);
  const resolved = await resolveCreatorProfileBySlug(supabase, decodedSlug);

  if (!resolved) {
    notFound();
  }

  const { profile, canonicalSlug } = resolved;
  if (decodedSlug !== canonicalSlug) {
    redirect(`/creator/${encodeURIComponent(canonicalSlug)}`);
  }

  return (
    <CreatorProfileClient
      username={canonicalSlug}
      initialCreator={profile as any}
      fromAtShare={fromAtShare}
    />
  );
}
