import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';
import { getCommunityDetail } from '@/src/lib/community-service';
import { CommunityDetailClient } from './CommunityDetailClient';
import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';

export const metadata: Metadata = {
  title: 'Community | SoundBridge',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ username: string }>;
};

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export default async function CommunityPage({ params }: PageProps) {
  const { username: slug } = await params;
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    redirect(`/login?redirect=${encodeURIComponent(`/community/${slug}`)}`);
  }

  const supabase = createServerClient();
  const decoded = decodeURIComponent(slug);
  const resolved = await resolveCreatorProfileBySlug(supabase, decoded);
  if (!resolved || String(resolved.profile.role).toLowerCase() !== 'creator') {
    notFound();
  }

  const { profile, canonicalSlug } = resolved;
  if (decoded !== canonicalSlug) {
    redirect(`/community/${encodeURIComponent(canonicalSlug)}`);
  }

  const cookieStore = await cookies();
  const authSupabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const result = await getCommunityDetail(authSupabase, profile.id as string, viewerId);
  if (!result.ok) {
    if (result.reason === 'not_member') {
      redirect('/network?tab=communities');
    }
    notFound();
  }

  return <CommunityDetailClient initial={result.community} />;
}
