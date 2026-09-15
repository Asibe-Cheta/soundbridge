'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createBrowserClient } from '@/src/lib/supabase';

/**
 * Self-service Sound Division tagging (NSO_1B.MD / WEB_TEAM_NSO_1B.MD). Only
 * rendered for a track's owner when they are also sound_movements.founding_artist_id
 * for at least one movement — the gating query runs server-side in page.tsx, so
 * `options` is already empty for the overwhelming majority of creators.
 *
 * Writes go straight to track_sound_divisions from the browser client, not
 * through an API route — RLS (20260915000000_sound_division_self_service.sql)
 * enforces ownership + movement membership, so there's nothing to re-validate
 * server-side.
 */
export interface SoundDivisionOption {
  id: string;
  name: string;
  movementName: string;
}

interface TrackSoundDivisionSectionProps {
  trackId: string;
  isOwner: boolean;
  options: SoundDivisionOption[];
  initialSelectedIds: string[];
}

export function TrackSoundDivisionSection({
  trackId,
  isOwner,
  options,
  initialSelectedIds,
}: TrackSoundDivisionSectionProps) {
  const [baseline, setBaseline] = useState<Set<string>>(new Set(initialSelectedIds));
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!isOwner || options.length === 0) {
    return null;
  }

  const movementName = options[0].movementName;
  const isDirty = selected.size !== baseline.size || [...selected].some((id) => !baseline.has(id));

  const toggle = (id: string) => {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const toInsert = [...selected].filter((id) => !baseline.has(id));
      const toDelete = [...baseline].filter((id) => !selected.has(id));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('track_sound_divisions')
          .insert(toInsert.map((division_id) => ({ track_id: trackId, division_id })));
        if (insErr) throw insErr;
      }
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('track_sound_divisions')
          .delete()
          .eq('track_id', trackId)
          .in('division_id', toDelete);
        if (delErr) throw delErr;
      }
      setBaseline(new Set(selected));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save Sound Divisions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles size={16} className="text-amber-400" />
        Sound Division
      </div>
      <p className="text-sm text-gray-400 mt-1 mb-3">
        Tag this track into one or more {movementName} Sound Divisions. This is separate from
        the track&apos;s genre, which stays unchanged.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              aria-pressed={isSelected}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      {saved && !isDirty && <p className="text-sm text-green-400 mb-2">Saved.</p>}
      <button
        type="button"
        disabled={!isDirty || saving}
        onClick={() => void save()}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          !isDirty || saving
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
