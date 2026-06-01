'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { recordAppOpen, updatePrimaryCity } from '@/src/lib/user-behaviour-service';
import { createClient } from '@/src/lib/supabase-browser';

/**
 * Records app-open sessions for behaviour profiling (parity with mobile foreground).
 */
export function UserBehaviourSessionTracker() {
  const { user } = useAuth();
  const supabase = createClient();
  const lastRecordedRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.id) return;

    const record = () => {
      const now = Date.now();
      // Avoid duplicate calls within the same second (React strict mode / rapid events)
      if (now - lastRecordedRef.current < 1000) return;
      lastRecordedRef.current = now;
      void recordAppOpen(supabase, user.id);
    };

    record();

    void supabase
      .from('profiles')
      .select('city, location')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        void updatePrimaryCity(supabase, user.id, data?.city || data?.location);
      });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        record();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user?.id, supabase]);

  return null;
}
