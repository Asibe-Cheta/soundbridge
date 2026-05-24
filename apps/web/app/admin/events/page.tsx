'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type AdminEventRow = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
  computed_status: string;
  tickets_sold: number;
  creator: { username?: string; display_name?: string } | null;
  analytics_summary: {
    notifications_sent?: number;
    event_page_views?: number;
    bookmarks_count?: number;
    shares_link_count?: number;
    shares_card_count?: number;
  } | null;
};

export default function AdminEventsPage() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<AdminEventRow | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetchWithSupabaseAuth(`/api/admin/events?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load events');
      setEvents(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6 max-w-7xl mx-auto">
        <div className={`rounded-xl border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Events</h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Read-only overview of platform events and performance summaries.
          </p>
        </div>

        <div className={`flex flex-wrap gap-3 mb-4 rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event or creator"
            className={`px-3 py-2 rounded border text-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`px-3 py-2 rounded border text-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="">All statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Live">Live</option>
            <option value="Past">Past</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded bg-pink-600 text-white text-sm hover:bg-pink-700"
          >
            Apply
          </button>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {loading ? (
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Loading…</p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="min-w-full text-sm">
              <thead className={theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                <tr>
                  {['Event', 'Creator', 'Created', 'Event date', 'Location', 'Genre', 'Status', 'Tickets'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className={`cursor-pointer border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/60' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setSelected(event)}
                  >
                    <td className="px-3 py-2">{event.title}</td>
                    <td className="px-3 py-2">{event.creator?.display_name || event.creator?.username || '—'}</td>
                    <td className="px-3 py-2">{new Date(event.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{new Date(event.event_date).toLocaleString()}</td>
                    <td className="px-3 py-2">{event.location || '—'}</td>
                    <td className="px-3 py-2">{event.category || '—'}</td>
                    <td className="px-3 py-2">{event.computed_status}</td>
                    <td className="px-3 py-2">{event.tickets_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}>
            <div
              className={`max-w-lg w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-2">{selected.title}</h2>
              <p className="text-sm opacity-80 mb-4">{selected.location} · {selected.category}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>Notifications sent: {selected.analytics_summary?.notifications_sent ?? 0}</div>
                <div>Page views: {selected.analytics_summary?.event_page_views ?? 0}</div>
                <div>Bookmarks: {selected.analytics_summary?.bookmarks_count ?? 0}</div>
                <div>
                  Shares: {(selected.analytics_summary?.shares_link_count ?? 0) + (selected.analytics_summary?.shares_card_count ?? 0)}
                </div>
              </div>
              <button type="button" className="mt-6 px-4 py-2 rounded bg-gray-700 text-white" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
