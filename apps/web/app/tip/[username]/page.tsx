import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import { getSiteUrl } from '@/src/lib/site-url';
import { TipRoomClient } from './TipRoomClient';

interface PageProps {
  params: Promise<{ username: string }>;
}

const SITE_URL = getSiteUrl();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = createServerClient();
  const slug = decodeURIComponent(username);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url')
    .eq('username', slug)
    .eq('role', 'creator')
    .maybeSingle();

  if (!profile) {
    return { title: 'Creator not found — SoundBridge' };
  }

  const displayName =
    (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
    (typeof profile.username === 'string' && profile.username.trim()) ||
    'Creator';

  return {
    title: `Support ${displayName} — SoundBridge`,
    description: `Send a tip to ${displayName} on SoundBridge.`,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/tip/${encodeURIComponent(slug)}` },
  };
}

export default async function TipRoomPage({ params }: PageProps) {
  const { username } = await params;
  const supabase = createServerClient();
  const slug = decodeURIComponent(username);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, role')
    .eq('username', slug)
    .eq('role', 'creator')
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const creatorId = profile.id as string;
  const canonicalUsername =
    typeof profile.username === 'string' && profile.username.trim()
      ? profile.username.trim()
      : slug;
  const displayName =
    (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
    canonicalUsername;
  const avatarUrl =
    typeof profile.avatar_url === 'string' && profile.avatar_url.trim()
      ? profile.avatar_url
      : null;

  const joinCommunityUrl = `/${encodeURIComponent(canonicalUsername)}/home`;

  return (
    <TipRoomClient
      creatorId={creatorId}
      canonicalUsername={canonicalUsername}
      displayName={displayName}
      avatarUrl={avatarUrl}
      joinCommunityUrl={joinCommunityUrl}
    />
  );
}
