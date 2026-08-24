'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { Radio, RefreshCw, Users, DollarSign, Search } from 'lucide-react';

type Summary = {
  total_streams: number;
  active_now: number;
  unique_creators: number;
};

type StreamRow = {
  id: string;
  creator_id: string;
  creator_username: string | null;
  creator_display_name: string | null;
  status: 'active' | 'ended' | 'failed';
  title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  viewer_count: number;
  tip_count: number;
  tip_totals_by_currency: { currency: string; amount: number }[];
};

const formatDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');
const formatMoney = (n: number, currency: string) => {
  const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : '$';
  return `${sym}${Number(n).toFixed(2)}`;
};
const formatDuration = (seconds: number | null) => {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const STATUS_STYLES: Record<StreamRow['status'], string> = {
  active: 'bg-red-500/15 text-red-400 border-red-500/30',
  ended: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  failed: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
};

export default function AdminLiveStreamsPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<'' | 'active' | 'ended' | 'failed'>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const res = await fetchWithSupabaseAuth(`/api/admin/live-streams?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load live streams');
      }

      const data = await res.json();
      setSummary(data.summary ?? null);
      setStreams(data.streams ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Live Streams</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>Who's gone live, past and present, and tips received per session</p>
        </div>
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

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400 text-sm">{error}</div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <Radio className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>Live now</p>
            </div>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.active_now.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Total streams ever</p>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.total_streams.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>Unique creators who've gone live</p>
            </div>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.unique_creators.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className={`rounded-lg border ${cardClass}`}>
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${mutedClass}`} />
            <h2 className={`font-medium ${textClass}`}>Stream sessions</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(['', 'active', 'ended', 'failed'] as const).map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setPage(0);
                  }}
                  className={`px-2 py-1 rounded text-xs capitalize ${
                    status === s
                      ? 'bg-blue-600 text-white'
                      : dark
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
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
                  placeholder="Search creator…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={`pl-9 pr-3 py-2 rounded text-sm border ${
                    dark
                      ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button type="submit" className="px-3 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white">
                Search
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>Loading…</div>
        ) : streams.length === 0 ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>No live streams match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Title</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Status</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Started</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Duration</th>
                  <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Peak viewers</th>
                  <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Tips</th>
                </tr>
              </thead>
              <tbody>
                {streams.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className={`px-4 py-3 ${textClass}`}>
                      <span className="font-medium">{s.creator_display_name || s.creator_username || 'Unknown'}</span>
                      {s.creator_username && <span className={`block text-xs ${mutedClass}`}>@{s.creator_username}</span>}
                    </td>
                    <td className={`px-4 py-3 ${mutedClass}`}>{s.title || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${textClass}`}>{formatDate(s.started_at)}</td>
                    <td className={`px-4 py-3 ${mutedClass}`}>{formatDuration(s.duration_seconds)}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>{s.viewer_count.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>
                      {s.tip_count === 0 ? (
                        <span className={mutedClass}>—</span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {s.tip_count}
                          </span>
                          {s.tip_totals_by_currency.map((t) => (
                            <span key={t.currency} className={`block text-xs ${mutedClass}`}>
                              {formatMoney(t.amount, t.currency)}
                            </span>
                          ))}
                        </>
                      )}
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
              Page {page + 1} of {totalPages} · {total.toLocaleString()} streams
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-1 rounded disabled:opacity-40 ${dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1 rounded disabled:opacity-40 ${dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
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
