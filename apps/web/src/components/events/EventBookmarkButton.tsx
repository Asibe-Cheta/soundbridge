'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type EventBookmarkButtonProps = {
  eventId: string;
  size?: number;
  className?: string;
  onToggle?: (bookmarked: boolean) => void;
};

export function EventBookmarkButton({
  eventId,
  size = 18,
  className = '',
  onToggle,
}: EventBookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithSupabaseAuth(`/api/events/${eventId}/bookmark`);
        const json = await res.json();
        if (!cancelled) setBookmarked(!!json.bookmarked);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;

      setLoading(true);
      try {
        const method = bookmarked ? 'DELETE' : 'POST';
        const res = await fetchWithSupabaseAuth(`/api/events/${eventId}/bookmark`, { method });
        if (res.ok) {
          const next = method === 'POST';
          setBookmarked(next);
          onToggle?.(next);
        } else if (res.status === 401) {
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('[EventBookmarkButton]', err);
      } finally {
        setLoading(false);
      }
    },
    [bookmarked, eventId, loading, onToggle],
  );

  return (
    <button
      type="button"
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark event'}
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full p-2 transition-opacity hover:opacity-80 disabled:opacity-50 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <Bookmark
        size={size}
        fill={bookmarked ? '#EC4899' : 'none'}
        color={bookmarked ? '#EC4899' : 'currentColor'}
      />
    </button>
  );
}
