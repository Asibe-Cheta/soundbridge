'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Users } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type JoinCommunityButtonProps = {
  creatorId: string;
  creatorName: string;
  className?: string;
  onMembershipChange?: (isMember: boolean) => void;
};

export function JoinCommunityButton({
  creatorId,
  creatorName,
  className = '',
  onMembershipChange,
}: JoinCommunityButtonProps) {
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadMembership = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithSupabaseAuth(
        `/api/community/membership?creator_id=${encodeURIComponent(creatorId)}`,
      );
      const json = await res.json();
      const member = Boolean(json?.is_member);
      setIsMember(member);
      onMembershipChange?.(member);
    } catch {
      setIsMember(false);
    } finally {
      setLoading(false);
    }
  }, [creatorId, onMembershipChange]);

  useEffect(() => {
    loadMembership();
  }, [loadMembership]);

  const showConfirmation = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const handleJoin = async () => {
    setActing(true);
    try {
      const res = await fetchWithSupabaseAuth('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId, join_source: 'manual' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to join');
      setIsMember(true);
      onMembershipChange?.(true);
      showConfirmation(
        `You have joined ${creatorName}'s community. You will now receive their updates and announcements.`,
      );
    } catch (e) {
      console.error('[JoinCommunityButton]', e);
    } finally {
      setActing(false);
    }
  };

  const handleLeave = async () => {
    setActing(true);
    try {
      const res = await fetchWithSupabaseAuth('/api/community/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to leave');
      setIsMember(false);
      setConfirmLeave(false);
      onMembershipChange?.(false);
    } catch (e) {
      console.error('[JoinCommunityButton] leave', e);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className={`flex items-center justify-center rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {toast ? (
        <p className="mb-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
          {toast}
        </p>
      ) : null}

      {confirmLeave ? (
        <div className="rounded-lg border border-gray-600 bg-gray-900/80 p-3 text-left">
          <p className="mb-3 text-sm text-gray-200">
            Leave {creatorName}&apos;s community? You will no longer receive their community updates.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLeave}
              disabled={acting}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Leave Community'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              disabled={acting}
              className="flex-1 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isMember ? (
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          disabled={acting}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/25 transition-colors"
        >
          <Check className="h-4 w-4" />
          Community Member
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={acting}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-500 bg-transparent px-4 py-2 text-sm font-medium text-white hover:border-gray-400 hover:bg-gray-700/50 transition-colors"
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Users className="h-4 w-4" />
              Join Community
            </>
          )}
        </button>
      )}
    </div>
  );
}
