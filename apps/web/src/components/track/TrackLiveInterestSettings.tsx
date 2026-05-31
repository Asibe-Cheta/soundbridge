'use client';

import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

interface TrackLiveInterestSettingsProps {
  trackId: string;
  isOwner: boolean;
  isMusicTrack: boolean;
  initialEnabled: boolean;
}

export function TrackLiveInterestSettings({
  trackId,
  isOwner,
  isMusicTrack,
  initialEnabled,
}: TrackLiveInterestSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner || !isMusicTrack) {
    return null;
  }

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithSupabaseAuth(`/api/audio-tracks/${trackId}/live-interest`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live_interest_enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Failed to update live interest');
      }
      setEnabled(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radio size={16} className="text-pink-400" />
            Live Interest
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Listeners who replay this track can express interest in hearing you live. Turn off to disable the
            prompt for this track.
          </p>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void toggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-pink-600' : 'bg-gray-600'
          } ${saving ? 'opacity-60' : ''}`}
          aria-pressed={enabled}
          aria-label="Toggle live interest"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
