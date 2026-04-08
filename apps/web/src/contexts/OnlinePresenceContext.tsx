'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/src/lib/supabase-browser';
import { useAuth } from '@/src/contexts/AuthContext';

type OnlinePresenceContextValue = {
  onlineUserIds: Set<string>;
  isUserOnline: (userId?: string | null) => boolean;
  connected: boolean;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue | undefined>(undefined);

export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineUserIdsList, setOnlineUserIdsList] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  const updateOnlineUsersFromChannel = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const state = channel.presenceState();
    setOnlineUserIdsList(Object.keys(state || {}));
  }, []);

  const loadShowOnlineStatus = useCallback(async (userId: string): Promise<boolean> => {
    // Primary source: profiles.show_online_status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('show_online_status')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && typeof profileData?.show_online_status === 'boolean') {
      return profileData.show_online_status;
    }

    // Fallback: user_privacy_settings.show_online_status
    const { data: privacyData } = await supabase
      .from('user_privacy_settings')
      .select('show_online_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (typeof privacyData?.show_online_status === 'boolean') {
      return privacyData.show_online_status;
    }

    return true;
  }, [supabase]);

  const startTracking = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !user?.id) return;
    if (!showOnlineStatus) {
      await channel.untrack();
      return;
    }
    await channel.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
    });
  }, [showOnlineStatus, user?.id]);

  const cleanupPresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel) return;
    try {
      await channel.untrack();
      await supabase.removeChannel(channel);
    } finally {
      channelRef.current = null;
      setConnected(false);
      setOnlineUserIdsList([]);
    }
  }, [supabase]);

  useEffect(() => {
    const onVisibilitySettingChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ showOnlineStatus?: boolean }>;
      if (typeof customEvent.detail?.showOnlineStatus === 'boolean') {
        setShowOnlineStatus(customEvent.detail.showOnlineStatus);
      }
    };

    window.addEventListener('online-presence:visibility-changed', onVisibilitySettingChanged);
    return () => window.removeEventListener('online-presence:visibility-changed', onVisibilitySettingChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!user?.id) {
        await cleanupPresence();
        return;
      }

      await cleanupPresence();
      const canBroadcast = await loadShowOnlineStatus(user.id);
      if (cancelled) return;
      setShowOnlineStatus(canBroadcast);

      const channel = supabase.channel('global_presence', {
        config: { presence: { key: user.id } },
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, updateOnlineUsersFromChannel)
        .on('presence', { event: 'join' }, updateOnlineUsersFromChannel)
        .on('presence', { event: 'leave' }, updateOnlineUsersFromChannel)
        .subscribe(async (status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            await startTracking();
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnected(false);
          }
        });
    };

    void init();
    return () => {
      cancelled = true;
      void cleanupPresence();
    };
  }, [cleanupPresence, loadShowOnlineStatus, startTracking, supabase, updateOnlineUsersFromChannel, user?.id]);

  useEffect(() => {
    if (!connected) return;
    void startTracking();
  }, [connected, startTracking]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const channel = channelRef.current;
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [supabase]);

  const onlineUserIds = useMemo(() => new Set(onlineUserIdsList), [onlineUserIdsList]);
  const value = useMemo<OnlinePresenceContextValue>(
    () => ({
      onlineUserIds,
      connected,
      isUserOnline: (userId?: string | null) => Boolean(userId && onlineUserIds.has(userId)),
    }),
    [connected, onlineUserIds],
  );

  return <OnlinePresenceContext.Provider value={value}>{children}</OnlinePresenceContext.Provider>;
}

export function useOnlinePresence() {
  const context = useContext(OnlinePresenceContext);
  if (!context) {
    throw new Error('useOnlinePresence must be used within OnlinePresenceProvider');
  }
  return context;
}
