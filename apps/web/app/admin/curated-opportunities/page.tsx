'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  opportunity_type: string;
  genre_tags: string[] | null;
  location_city: string | null;
  source_url: string | null;
  expires_at: string | null;
  created_at: string;
};

const TYPES = [
  'open_mic',
  'venue',
  'policy_change',
  'brand_partnership',
  'industry_news',
] as const;

export default function AdminCuratedOpportunitiesPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const input = dark
    ? 'bg-gray-900 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [opportunityType, setOpportunityType] = useState<string>('open_mic');
  const [genreTags, setGenreTags] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithSupabaseAuth('/api/admin/curated-opportunities');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setOpportunities(json.opportunities ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/curated-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          opportunity_type: opportunityType,
          genre_tags: genreTags,
          location_city: locationCity || null,
          source_url: sourceUrl || null,
          expires_at: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create');
      setTitle('');
      setDescription('');
      setGenreTags('');
      setLocationCity('');
      setSourceUrl('');
      setExpiresAt('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className={`h-8 w-8 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
          <div>
            <h1 className={`text-2xl font-semibold ${text}`}>Curated opportunities</h1>
            <p className={`text-sm ${muted}`}>
              Manually add opportunities for AI Career Adviser proactive alerts
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
            dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error ? <p className="mb-4 text-red-500">{error}</p> : null}

      <form onSubmit={(e) => void submit(e)} className={`rounded-lg border p-5 mb-8 ${card}`}>
        <h2 className={`font-semibold mb-4 ${text}`}>Add opportunity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Type *</label>
            <select
              value={opportunityType}
              onChange={(e) => setOpportunityType(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${muted}`}>City</label>
            <input
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Genre tags (comma-separated)</label>
            <input
              value={genreTags}
              onChange={(e) => setGenreTags(e.target.value)}
              placeholder="afrobeats, r&b"
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Expires at</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`block text-xs font-medium mb-1 ${muted}`}>Source URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${input}`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 px-4 py-2 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add opportunity'}
        </button>
      </form>

      {loading ? (
        <p className={muted}>Loading…</p>
      ) : opportunities.length === 0 ? (
        <p className={muted}>No curated opportunities yet.</p>
      ) : (
        <div className="space-y-3">
          {opportunities.map((o) => (
            <div key={o.id} className={`rounded-lg border p-4 ${card}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className={`font-medium ${text}`}>{o.title}</h3>
                <span className="text-xs uppercase tracking-wide text-amber-500">{o.opportunity_type}</span>
              </div>
              {o.description ? <p className={`mt-2 text-sm ${muted}`}>{o.description}</p> : null}
              <div className={`mt-2 flex flex-wrap gap-2 text-xs ${muted}`}>
                {o.location_city ? <span>{o.location_city}</span> : null}
                {o.genre_tags?.length ? <span>{o.genre_tags.join(', ')}</span> : null}
                {o.expires_at ? <span>Expires {o.expires_at}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
