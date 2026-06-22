'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type VenuePrefs = {
  opportunity_scouting_enabled?: boolean;
  notifications_enabled?: boolean;
  notification_radius_km?: number;
};

export default function VenuePreferencesPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<VenuePrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithSupabaseAuth('/api/venue-notification-preferences');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        setPrefs(json.preferences ?? {});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveScouting = async (enabled: boolean) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/venue-notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_scouting_enabled: enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setPrefs(json.preferences);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 max-w-2xl mx-auto ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Link
        href="/settings"
        className={`inline-flex items-center gap-2 text-sm mb-6 ${muted} hover:${text}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <MapPin className={`h-8 w-8 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />
        <div>
          <h1 className={`text-2xl font-semibold ${text}`}>Venue preferences</h1>
          <p className={`text-sm ${muted}`}>Location-based performance and venue alerts</p>
        </div>
      </div>

      {error ? <p className="mb-4 text-red-500 text-sm">{error}</p> : null}
      {saved ? <p className="mb-4 text-green-500 text-sm">Saved.</p> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : (
        <div className={`rounded-xl border p-5 ${card}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className={`font-medium ${text}`}>Notify me about performance opportunities</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                We will occasionally search for open mic nights and venue opportunities matching your
                genre and location, and let you know.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              role="switch"
              aria-checked={Boolean(prefs?.opportunity_scouting_enabled)}
              onClick={() => void saveScouting(!prefs?.opportunity_scouting_enabled)}
              className={`relative shrink-0 h-7 w-12 rounded-full transition ${
                prefs?.opportunity_scouting_enabled ? 'bg-pink-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition ${
                  prefs?.opportunity_scouting_enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
