'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { createBrowserClient } from '@/src/lib/supabase';
import { needsCommunityWelcome } from '@/src/lib/community-entry';

const SKIP_PREFIXES = [
  '/welcome',
  '/login',
  '/signup',
  '/auth',
  '/verify-email',
  '/app',
  '/legal',
  '/aml-policy',
];

export function CommunityWelcomeGate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user?.id || !pathname) return;
    if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;

    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('community_entry_creator_id, community_entry_shown_at, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled || !needsCommunityWelcome(profile) || !profile?.community_entry_creator_id) return;

      const { data: creator } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', profile.community_entry_creator_id)
        .maybeSingle();

      if (cancelled || !creator?.username) return;
      router.replace(`/welcome/${encodeURIComponent(creator.username)}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, pathname, router]);

  return null;
}
