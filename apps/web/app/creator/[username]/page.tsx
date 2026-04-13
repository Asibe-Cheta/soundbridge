import type { Metadata } from 'next';
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

const SITE_URL = 'https://soundbridge.live';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

async function getResolvedCreator(slug: string) {
  const supabase = createServiceClient();
  const decodedSlug = decodeURIComponent(slug);
  const resolved = await resolveCreatorProfileBySlug(supabase, decodedSlug);
  return { supabase, decodedSlug, resolved };
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username: slug } = await params;
  const { resolved } = await getResolvedCreator(slug);

  if (!resolved) {
    return {
      title: 'Creator Not Found — SoundBridge',
      description: 'This creator profile could not be found on SoundBridge.',
    };
  }

  const { profile, canonicalSlug } = resolved;
  const displayName =
    (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
    (typeof profile.username === 'string' && profile.username.trim()) ||
    'Creator';
  const bio =
    (typeof profile.bio === 'string' && profile.bio.trim()) ||
    `${displayName} on SoundBridge. Discover tracks, albums, and creator updates.`;
  const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(canonicalSlug)}`;
  const avatarUrl =
    typeof profile.avatar_url === 'string' && profile.avatar_url.trim()
      ? profile.avatar_url
      : undefined;
  const ogImage = toAbsoluteUrl(avatarUrl) || DEFAULT_OG_IMAGE;

  return {
    title: `${displayName} on SoundBridge`,
    description: bio,
    alternates: { canonical: profileUrl },
    openGraph: {
      title: `${displayName} on SoundBridge`,
      description: bio,
      url: profileUrl,
      type: 'profile' as any,
      images: [{ url: ogImage, alt: `${displayName} profile photo` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} on SoundBridge`,
      description: bio,
      images: [ogImage],
    },
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username: slug } = await params;
  const headerList = await headers();
  const fromAtShare = headerList.get('x-sb-open-app-banner') === '1';

  const { decodedSlug, resolved } = await getResolvedCreator(slug);

  if (!resolved) {
    notFound();
  }

  const { profile, canonicalSlug } = resolved;
  if (decodedSlug !== canonicalSlug) {
    redirect(`/creator/${encodeURIComponent(canonicalSlug)}`);
  }

  const displayName =
    (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
    (typeof profile.username === 'string' && profile.username.trim()) ||
    'Creator';
  const bio =
    (typeof profile.bio === 'string' && profile.bio.trim()) ||
    `${displayName} on SoundBridge. Discover tracks, albums, and creator updates.`;
  const avatarUrl =
    typeof profile.avatar_url === 'string' && profile.avatar_url.trim()
      ? profile.avatar_url
      : undefined;
  const schemaImage = toAbsoluteUrl(avatarUrl) || DEFAULT_OG_IMAGE;
  const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(canonicalSlug)}`;
  const schemaType = String(profile.role || '').toLowerCase() === 'creator' ? 'MusicGroup' : 'Person';
  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: displayName,
    url: profileUrl,
    description: bio,
    image: schemaImage,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <CreatorProfileClient
        username={canonicalSlug}
        initialCreator={profile as any}
        fromAtShare={fromAtShare}
      />
    </>
  );
}
