import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';
import { CommunityWelcomeScreen } from './CommunityWelcomeScreen';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function CommunityWelcomePage({ params }: PageProps) {
  const { username: slug } = await params;
  const decoded = decodeURIComponent(slug);
  const supabase = createServerClient();
  const resolved = await resolveCreatorProfileBySlug(supabase, decoded);

  if (!resolved) notFound();

  const { profile, canonicalSlug } = resolved;
  if (decoded !== canonicalSlug) {
    redirect(`/welcome/${encodeURIComponent(canonicalSlug)}`);
  }

  const p = profile as Record<string, unknown>;
  const displayName =
    (typeof p.display_name === 'string' && p.display_name.trim()) ||
    (typeof p.username === 'string' && p.username.trim()) ||
    canonicalSlug;
  const avatarUrl = typeof p.avatar_url === 'string' && p.avatar_url.trim() ? p.avatar_url : null;
  const headline =
    (typeof p.professional_headline === 'string' && p.professional_headline.trim()) ||
    (Array.isArray(p.genres) && typeof p.genres[0] === 'string' ? String(p.genres[0]) : '') ||
    'Creator';

  return (
    <CommunityWelcomeScreen
      creatorId={profile.id as string}
      canonicalUsername={canonicalSlug}
      displayName={displayName}
      avatarUrl={avatarUrl}
      subtitle={headline}
    />
  );
}
