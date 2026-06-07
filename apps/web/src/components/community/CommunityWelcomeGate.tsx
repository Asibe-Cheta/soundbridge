'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

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
      const { data } = await fetchJsonWithAuth<{
        needsWelcome?: boolean;
        welcomeUsername?: string | null;
      }>('/api/user/community-welcome-status');

      if (
        !cancelled &&
        data?.needsWelcome &&
        typeof data.welcomeUsername === 'string' &&
        data.welcomeUsername.length > 0
      ) {
        router.replace(`/welcome/${encodeURIComponent(data.welcomeUsername)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, pathname, router]);

  return null;
}
