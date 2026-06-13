'use client';

import React, { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { dismissCommunityTipPrompt } from '@/src/lib/community-join-prompt-storage';

type PostTipCommunityPromptProps = {
  creatorId: string;
  creatorName: string;
  onJoined?: () => void;
  onDismiss?: () => void;
};

export function PostTipCommunityPrompt({
  creatorId,
  creatorName,
  onJoined,
  onDismiss,
}: PostTipCommunityPromptProps) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId, join_source: 'post_tip_prompt' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to join');
      setJoined(true);
      onJoined?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join community');
    } finally {
      setJoining(false);
    }
  };

  const handleMaybeLater = () => {
    dismissCommunityTipPrompt(creatorId);
    onDismiss?.();
  };

  if (joined) {
    return (
      <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-left">
        <p className="text-sm text-green-300">
          You have joined {creatorName}&apos;s community. You will now receive their updates and
          announcements.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-5 text-left">
      <div className="mb-3 flex items-center gap-2 text-red-300">
        <Users className="h-5 w-5" />
        <span className="font-medium text-white">Stay connected</span>
      </div>
      <p className="mb-1 text-sm text-gray-200">You just supported {creatorName}.</p>
      <p className="mb-4 text-sm text-gray-400">
        Would you like to join their community to stay connected with their journey, upcoming events
        and exclusive moments?
      </p>
      {error ? <p className="mb-3 text-xs text-red-400">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 px-4 py-2.5 text-sm font-medium text-white hover:from-red-700 hover:to-pink-600 disabled:opacity-50"
        >
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Their Community'}
        </button>
        <button
          type="button"
          onClick={handleMaybeLater}
          disabled={joining}
          className="flex-1 rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
