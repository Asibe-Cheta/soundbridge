'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, Lock } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type AnalyticsPayload = {
  notifications_sent: number;
  notifications_opened: number;
  event_page_views: number;
  bookmarks_count: number;
  shares_link_count: number;
  shares_card_count: number;
  ticket_sales_count: number;
  ticket_sales_revenue: number;
  open_rate_percent: number;
  notification_to_view_rate_percent: number;
  page_to_purchase_rate_percent: number;
  shares_total: number;
  views_by_city: Record<string, number> | null;
  views_by_genre_match: Record<string, number> | null;
  peak_view_hour: number | null;
  notification_open_rate: number | null;
};

type EventAnalyticsPanelProps = {
  eventId: string;
  tier: 'free' | 'premium' | 'unlimited';
  compact?: boolean;
};

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4" style={{ minWidth: 0 }}>
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub ? <div className="text-xs text-gray-400 mt-1">{sub}</div> : null}
    </div>
  );
}

export function EventAnalyticsPanel({ eventId, tier, compact = false }: EventAnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithSupabaseAuth(`/api/events/${eventId}/analytics`);
        const json = await res.json();
        if (!cancelled && res.ok) setData(json.data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (tier === 'free') {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-6 text-center">
        <Lock className="mx-auto mb-3 text-purple-300" size={28} />
        <h3 className="text-lg font-semibold text-white mb-2">See how your event is performing</h3>
        <p className="text-sm text-gray-300 mb-4 max-w-md mx-auto">
          Reach, ticket sales, notification opens and more. Available on Premium and Unlimited.
        </p>
        <Link href="/pricing" className="btn-primary inline-flex items-center gap-2">
          Access Premium
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading analytics…</p>;
  }

  const d: AnalyticsPayload = data ?? {
    notifications_sent: 0,
    notifications_opened: 0,
    event_page_views: 0,
    bookmarks_count: 0,
    shares_link_count: 0,
    shares_card_count: 0,
    ticket_sales_count: 0,
    ticket_sales_revenue: 0,
    open_rate_percent: 0,
    notification_to_view_rate_percent: 0,
    page_to_purchase_rate_percent: 0,
    shares_total: 0,
    views_by_city: null,
    views_by_genre_match: null,
    peak_view_hour: null,
    notification_open_rate: null,
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="flex items-center gap-2 text-pink-400">
        <BarChart3 size={20} />
        <h3 className="font-semibold text-white">Event performance</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Notifications sent" value={d.notifications_sent} />
        <MetricCard
          label="Notifications opened"
          value={d.notifications_opened}
          sub={`${d.open_rate_percent}% open rate`}
        />
        <MetricCard label="Page views" value={d.event_page_views} />
        <MetricCard label="Bookmarks" value={d.bookmarks_count} />
        <MetricCard
          label="Shares"
          value={d.shares_total}
          sub={`${d.shares_link_count} link · ${d.shares_card_count} card`}
        />
        <MetricCard
          label="Ticket sales"
          value={d.ticket_sales_count}
          sub={`£${Number(d.ticket_sales_revenue).toFixed(2)} revenue`}
        />
      </div>

      {tier === 'unlimited' && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <h4 className="text-sm font-semibold text-purple-200">Advanced insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <MetricCard label="Notification → page view" value={`${d.notification_to_view_rate_percent}%`} />
            <MetricCard label="Page → purchase" value={`${d.page_to_purchase_rate_percent}%`} />
            {d.peak_view_hour != null && (
              <MetricCard label="Peak view hour" value={`${d.peak_view_hour}:00`} />
            )}
          </div>

          {d.views_by_city && Object.keys(d.views_by_city).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Views by city</p>
              <ul className="space-y-1 text-sm text-gray-200">
                {Object.entries(d.views_by_city).map(([city, count]) => (
                  <li key={city} className="flex justify-between">
                    <span>{city}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.views_by_genre_match && Object.keys(d.views_by_genre_match).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Views by genre match</p>
              <ul className="space-y-1 text-sm text-gray-200">
                {Object.entries(d.views_by_genre_match).map(([genre, count]) => (
                  <li key={genre} className="flex justify-between">
                    <span>{genre}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
