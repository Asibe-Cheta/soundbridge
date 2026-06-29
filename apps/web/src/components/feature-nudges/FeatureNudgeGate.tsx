'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';
import { AiCareerAdviserNudgeModal } from '@/src/components/feature-nudges/ContextNudgeModals';

const AUTH_PATH_PREFIXES = ['/login', '/signup', '/auth', '/verify-email', '/reset-password', '/forgot-password'];

export function FeatureNudgeGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [showAiNudge, setShowAiNudge] = useState(false);
  const [checked, setChecked] = useState(false);

  const isAuthPage = AUTH_PATH_PREFIXES.some((p) => pathname?.startsWith(p));

  const checkDeferredNudges = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await fetchJsonWithAuth<{
        aiCareerAdviser?: { eligible?: boolean };
      }>('/api/feature-nudges');
      if (data?.aiCareerAdviser?.eligible) {
        setShowAiNudge(true);
      }
    } catch {
      /* non-fatal */
    } finally {
      setChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (loading || !user || isAuthPage) return;
    if (checked) return;
    void checkDeferredNudges();
  }, [loading, user, isAuthPage, checked, checkDeferredNudges]);

  if (!user || isAuthPage || !showAiNudge) return null;

  return <AiCareerAdviserNudgeModal onClose={() => setShowAiNudge(false)} />;
}
