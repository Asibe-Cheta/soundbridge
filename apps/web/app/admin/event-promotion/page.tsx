'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { BarChart3, RefreshCw, Ticket, Bell, LayoutList } from 'lucide-react';

type Summary = {
  notifications_sent: number;
  notification_taps: number;
  feed_card_views: number;
  promotion_ticket_purchases: number;
  promotion_views: number;
  conversion_rate_pct: number;
  date_from: string;
  date_to: string;
};

type EventRow = {
  event_id: string;
  event_name: string;
  creator_id: string;
  creator_name: string;
  notifications_sent: number;
  notification_taps: number;
  feed_card_views: number;
  tickets_via_promotion: number;
  tickets_via_other: number;
  conversion_rate_pct: number;
};

type CreatorRow = {
  creator_id: string;
  creator_name: string;
  notifications_sent: number;
  notification_taps: number;
  feed_card_views: number;
  tickets_via_promotion: number;
  tickets_via_other: number;
  conversion_rate_pct: number;
  event_count: number;
};

type Tab = 'events' | 'creators';

const SORT_OPTIONS = [
  { id: 'notification_taps', label: 'Notification taps' },
  { id: 'feed_card_views', label: 'Feed card views' },
  { id: 'tickets_via_promotion', label: 'Promotion tickets' },
  { id: 'conversion_rate_pct', label: 'Conversion %' },
  { id: 'notifications_sent', label: 'Notifications sent' },
  { id: 'event_name', label: 'Event name' },
  { id: 'creator_name', label: 'Creator name' },
] as const;

export default function AdminEventPromotionPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = `text-sm rounded border px-2 py-2 ${
    dark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`;

  const [tab, setTab] = useState<Tab>('events');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<string>('notification_taps');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 25;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('view', tab);
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sort', sort);
      params.set('order', order);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithSupabaseAuth(`/api/admin/event-promotion?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load event promotion analytics');
      }

      const data = await res.json();
      setSummary(data.summary ?? null);
      setTotal(data.total ?? 0);
      if (tab === 'events') setEvents(data.events ?? []);
      else setCreators(data.creators ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, page, sort, order, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Events Promotion</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Notification and feed promotion attribution — taps, views, and ticket conversions
          </p>
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
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Notifications sent', value: summary.notifications_sent, icon: Bell },
            { label: 'Notification taps', value: summary.notification_taps, icon: Bell },
            { label: 'Feed card views', value: summary.feed_card_views, icon: LayoutList },
            { label: 'Promotion tickets', value: summary.promotion_ticket_purchases, icon: Ticket },
            { label: 'Conversion rate', value: `${summary.conversion_rate_pct}%`, icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className={`rounded-lg border p-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${mutedClass}`} />
                <span className={`text-xs ${mutedClass}`}>{label}</span>
              </div>
              <p className={`text-2xl font-semibold ${textClass}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-lg border mb-4 ${cardClass}`}>
        <div className="flex flex-col gap-3 p-4 border-b border-inherit">
          <div className="flex flex-wrap gap-2 items-center">
            {(
              [
                { id: 'events' as const, label: 'Per event' },
                { id: 'creators' as const, label: 'Per creator' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  tab === id
                    ? 'bg-red-600 text-white'
                    : dark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <label className={`text-xs ${mutedClass}`}>
              From
              <input
                type="date"
                className={`${inputClass} block mt-1`}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className={`text-xs ${mutedClass}`}>
              To
              <input
                type="date"
                className={`${inputClass} block mt-1`}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className={`text-xs ${mutedClass}`}>
              Sort by
              <select
                className={`${inputClass} block mt-1`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(0);
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`text-xs ${mutedClass}`}>
              Order
              <select
                className={`${inputClass} block mt-1`}
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value as 'asc' | 'desc');
                  setPage(0);
                }}
              >
                <option value="desc">High → low</option>
                <option value="asc">Low → high</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className={`p-6 text-sm ${mutedClass}`}>Loading…</p>
          ) : tab === 'events' ? (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Event</th>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Notif. sent</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Notif. taps</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Feed views</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Promo tickets</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Other tickets</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`p-6 text-center ${mutedClass}`}>
                      No promotion data in this range
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr
                      key={e.event_id}
                      className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}
                    >
                      <td className={`p-3 ${textClass}`}>{e.event_name}</td>
                      <td className={`p-3 ${mutedClass}`}>{e.creator_name}</td>
                      <td className={`p-3 text-right ${textClass}`}>{e.notifications_sent}</td>
                      <td className={`p-3 text-right ${textClass}`}>{e.notification_taps}</td>
                      <td className={`p-3 text-right ${textClass}`}>{e.feed_card_views}</td>
                      <td className={`p-3 text-right ${textClass}`}>{e.tickets_via_promotion}</td>
                      <td className={`p-3 text-right ${mutedClass}`}>{e.tickets_via_other}</td>
                      <td className={`p-3 text-right font-medium ${textClass}`}>
                        {e.conversion_rate_pct}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left p-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Events</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Notif. sent</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Notif. taps</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Feed views</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Promo tickets</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Other tickets</th>
                  <th className={`text-right p-3 font-medium ${mutedClass}`}>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {creators.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`p-6 text-center ${mutedClass}`}>
                      No creator rollup in this range
                    </td>
                  </tr>
                ) : (
                  creators.map((c) => (
                    <tr
                      key={c.creator_id}
                      className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}
                    >
                      <td className={`p-3 ${textClass}`}>{c.creator_name}</td>
                      <td className={`p-3 text-right ${mutedClass}`}>{c.event_count}</td>
                      <td className={`p-3 text-right ${textClass}`}>{c.notifications_sent}</td>
                      <td className={`p-3 text-right ${textClass}`}>{c.notification_taps}</td>
                      <td className={`p-3 text-right ${textClass}`}>{c.feed_card_views}</td>
                      <td className={`p-3 text-right ${textClass}`}>{c.tickets_via_promotion}</td>
                      <td className={`p-3 text-right ${mutedClass}`}>{c.tickets_via_other}</td>
                      <td className={`p-3 text-right font-medium ${textClass}`}>
                        {c.conversion_rate_pct}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-inherit">
            <span className={`text-sm ${mutedClass}`}>
              Page {page + 1} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`px-3 py-1 rounded text-sm disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200'
                }`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={`px-3 py-1 rounded text-sm disabled:opacity-40 ${
                  dark ? 'bg-gray-700 text-white' : 'bg-gray-200'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={`text-xs ${mutedClass}`}>
        Web feed parity: event strip + event post cards are live on <code>/feed</code>. Mobile
        FeedScreen vs TestFeedScreen parity is owned by the mobile team — flag separately if their
        TestFeedScreen is missing event promotion UI.
      </p>
    </div>
  );
}
