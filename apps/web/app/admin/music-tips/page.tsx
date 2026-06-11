'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { Music, RefreshCw, DollarSign, Disc3, Users, Search, Download } from 'lucide-react';

type Summary = {
  total_songs_uploaded: number;
  total_audio_uploads: number;
  songs_uploaded_this_month: number;
  total_podcasts: number;
  total_mixtapes: number;
  tracks_with_tips: number;
  total_track_tips: number;
  has_any_track_tips: boolean;
  tip_totals_by_currency: { currency: string; amount: number }[];
  date_from?: string | null;
  date_to?: string | null;
};

type TipRow = {
  id: string;
  amount: number;
  currency: string;
  tipped_at: string;
  is_anonymous: boolean;
  message: string | null;
  track_id: string;
  track_title: string;
  track_content_type: string | null;
  artist_username: string | null;
  artist_display_name: string | null;
  tipper_label: string;
  tipper_username: string | null;
  creator_earnings: number | null;
};

const formatDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');
const formatMoney = (n: number, currency: string) => {
  const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : '$';
  return `${sym}${Number(n).toFixed(2)}`;
};

export default function AdminMusicTipsPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tips, setTips] = useState<TipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const limit = 25;

  const inputClass = `text-sm rounded border px-2 py-2 ${
    dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`;

  const applyDatePreset = (preset: '7d' | '30d' | 'month' | 'all') => {
    const end = new Date();
    const to = end.toISOString().slice(0, 10);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      setPage(0);
      return;
    }
    const start = new Date(end);
    if (preset === '7d') start.setDate(start.getDate() - 6);
    else if (preset === '30d') start.setDate(start.getDate() - 29);
    else start.setDate(1);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(to);
    setPage(0);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithSupabaseAuth(`/api/admin/music-tips?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load music & tips data');
      }

      const data = await res.json();
      setSummary(data.summary ?? null);
      setTips(data.tips ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('export', 'csv');
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithSupabaseAuth(`/api/admin/music-tips?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `track-tips-${dateFrom || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const dateFilterActive = Boolean(dateFrom || dateTo);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Music & Track Tips</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Platform song uploads and tips linked to specific tracks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
              dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } disabled:opacity-50`}
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
              dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            onClick={load}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <Music className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>Songs uploaded</p>
            </div>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.total_songs_uploaded.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Songs this month</p>
            <p className={`text-2xl font-semibold ${textClass}`}>
              {summary.songs_uploaded_this_month.toLocaleString()}
            </p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>All audio uploads</p>
            <p className={`text-2xl font-semibold ${textClass}`}>
              {summary.total_audio_uploads.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              {summary.total_podcasts} podcasts · {summary.total_mixtapes} mixtapes
            </p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <Disc3 className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>
                Tracks tipped{dateFilterActive ? ' (filtered)' : ''}
              </p>
            </div>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.tracks_with_tips.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>
              Total track tips{dateFilterActive ? ' (filtered)' : ''}
            </p>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.total_track_tips.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>
                Tip volume{dateFilterActive ? ' (filtered)' : ''}
              </p>
            </div>
            {summary.tip_totals_by_currency.length ? (
              summary.tip_totals_by_currency.map((t) => (
                <p key={t.currency} className={`text-sm font-medium ${textClass}`}>
                  {formatMoney(t.amount, t.currency)}
                </p>
              ))
            ) : (
              <p className={`text-sm ${mutedClass}`}>No tips yet</p>
            )}
          </div>
        </div>
      )}

      {!summary?.has_any_track_tips && !loading && (
        <div className={`mb-6 rounded-lg border p-4 text-sm ${cardClass} ${mutedClass}`}>
          No completed tips linked to tracks yet. When fans tip from the music player, they will appear below.
        </div>
      )}

      <div className={`rounded-lg border ${cardClass}`}>
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-2">
            <Users className={`h-4 w-4 ${mutedClass}`} />
            <h2 className={`font-medium ${textClass}`}>Track tip activity</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(['7d', '30d', 'month', 'all'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyDatePreset(preset)}
                  className={`px-2 py-1 rounded text-xs ${
                    dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {preset === '7d'
                    ? '7 days'
                    : preset === '30d'
                      ? '30 days'
                      : preset === 'month'
                        ? 'This month'
                        : 'All time'}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className={inputClass}
              aria-label="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className={inputClass}
              aria-label="To date"
            />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative">
                <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${mutedClass}`} />
                <input
                  type="search"
                  placeholder="Search song, artist, tipper…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={`pl-9 pr-3 py-2 rounded text-sm border ${
                    dark
                      ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>Loading…</div>
        ) : tips.length === 0 ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>No track tips match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>When</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Song</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Artist</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Tipped by</th>
                  <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {tips.map((tip) => (
                  <tr
                    key={tip.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap ${textClass}`}>{formatDate(tip.tipped_at)}</td>
                    <td className={`px-4 py-3 ${textClass}`}>
                      <span className="font-medium">{tip.track_title}</span>
                      {tip.track_content_type && tip.track_content_type !== 'music' && (
                        <span className={`ml-2 text-xs ${mutedClass}`}>({tip.track_content_type})</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${mutedClass}`}>
                      {tip.artist_display_name || tip.artist_username || '—'}
                    </td>
                    <td className={`px-4 py-3 ${mutedClass}`}>
                      {tip.tipper_label}
                      {tip.tipper_username && (
                        <span className="block text-xs opacity-80">@{tip.tipper_username}</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${textClass}`}>
                      {formatMoney(tip.amount, tip.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div
            className={`flex items-center justify-between px-4 py-3 border-t text-sm ${dark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <span className={mutedClass}>
              Page {page + 1} of {totalPages} · {total.toLocaleString()} tips
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-1 rounded disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1 rounded disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
