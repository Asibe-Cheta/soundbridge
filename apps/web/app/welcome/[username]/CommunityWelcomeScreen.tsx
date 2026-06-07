'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { createBrowserClient } from '@/src/lib/supabase';
import { needsCommunityWelcome } from '@/src/lib/community-entry';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { CommunityWelcomeClient, type CommunityWelcomeClientProps } from './CommunityWelcomeClient';

export function CommunityWelcomeScreen(props: CommunityWelcomeClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('community_entry_creator_id, community_entry_shown_at, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!needsCommunityWelcome(profile)) {
          router.replace('/feed');
          return;
        }

        if (
          profile?.community_entry_creator_id &&
          profile.community_entry_creator_id !== props.creatorId
        ) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', profile.community_entry_creator_id)
            .maybeSingle();
          if (creator?.username) {
            router.replace(`/welcome/${encodeURIComponent(creator.username)}`);
            return;
          }
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, props.creatorId, router]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <CommunityWelcomeClient {...props} />
    </ProtectedRoute>
  );
}
