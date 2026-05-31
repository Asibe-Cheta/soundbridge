'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, RefreshCw, User } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { PRO_RESOURCE_LABELS } from '@/src/lib/pro-resource-analytics';

type SummaryRow = {
  event_type: string;
  resource: string | null;
  total_events: number;
  unique_users: number;
  events_7d: number;
  events_30d: number;
  last_event_at: string | null;
};

type UserEventRow = {
  id: string;
  event_type: string;
  resource: string | null;
  created_at: string;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

function summaryLabel(row: SummaryRow): string {
  if (row.event_type === 'screen_view') return PRO_RESOURCE_LABELS.screen_view;
  if (row.event_type === 'explore_courses_tap') return PRO_RESOURCE_LABELS.explore_courses_tap;
  if (row.resource && PRO_RESOURCE_LABELS[row.resource]) return PRO_RESOURCE_LABELS[row.resource];
  return row.resource || row.event_type;
}

function eventLabel(row: UserEventRow): string {
  if (row.event_type === 'screen_view') return 'Viewed Pro Resources';
  if (row.event_type === 'explore_courses_tap') return PRO_RESOURCE_LABELS.explore_courses_tap;
  if (row.resource && PRO_RESOURCE_LABELS[row.resource]) return PRO_RESOURCE_LABELS[row.resource];
  return row.resource || 'Resource tap';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ProResourcesAnalyticsPanel({ theme }: { theme: string }) {
  const dark = theme === 'dark';
  const cardCls = `${dark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`;
  const mutedCls = dark ? 'text-gray-400' : 'text-gray-600';
  const textCls = dark ? 'text-white' : 'text-gray-900';
  const rowBorder = dark ? 'border-gray-700' : 'border-gray-200';
  const headCls = dark ? 'text-gray-300' : 'text-gray-600';

  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<UserEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithSupabaseAuth('/api/admin/pro-resource-analytics?limit=100');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load Pro Resources analytics');
      }
      setSummary(data.summary || []);
      setRecentEvents(data.recentEvents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Pro Resources analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedSummary = [...summary].sort((a, b) => {
    if (a.resource === 'sa_booking') return -1;
    if (b.resource === 'sa_booking') return 1;
    return Number(b.total_events) - Number(a.total_events);
  });

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className={`h-5 w-5 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${textCls}`}>Pro Resources</h3>
            <p className={`text-sm ${mutedCls}`}>
              Screen views and partner resource taps (web + mobile)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading && !summary.length ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className={`ml-2 ${mutedCls}`}>Loading Pro Resources analytics…</span>
        </div>
      ) : error ? (
        <p className={`text-sm ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${rowBorder}`}>
                  <th className={`text-left py-2 pr-4 font-medium ${headCls}`}>Resource</th>
                  <th className={`text-right py-2 px-2 font-medium ${headCls}`}>Total</th>
                  <th className={`text-right py-2 px-2 font-medium ${headCls}`}>Unique users</th>
                  <th className={`text-right py-2 px-2 font-medium ${headCls}`}>Last 7d</th>
                  <th className={`text-right py-2 px-2 font-medium ${headCls}`}>Last 30d</th>
                  <th className={`text-right py-2 pl-2 font-medium ${headCls}`}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {sortedSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-6 text-center ${mutedCls}`}>
                      No Pro Resources events yet. Run the migration in Supabase, then track from web/mobile.
                    </td>
                  </tr>
                ) : (
                  sortedSummary.map((row) => {
                    const isBooking = row.resource === 'sa_booking';
                    return (
                      <tr
                        key={`${row.event_type}-${row.resource ?? 'none'}`}
                        className={`border-b ${rowBorder} ${isBooking ? (dark ? 'bg-pink-950/30' : 'bg-pink-50') : ''}`}
                      >
                        <td className={`py-3 pr-4 font-medium ${textCls}`}>
                          {summaryLabel(row)}
                          {isBooking && (
                            <span className={`ml-2 text-xs font-normal ${dark ? 'text-pink-300' : 'text-pink-600'}`}>
                              high value
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-2 text-right ${textCls}`}>{row.total_events}</td>
                        <td className={`py-3 px-2 text-right ${textCls}`}>{row.unique_users}</td>
                        <td className={`py-3 px-2 text-right ${textCls}`}>{row.events_7d}</td>
                        <td className={`py-3 px-2 text-right ${textCls}`}>{row.events_30d}</td>
                        <td className={`py-3 pl-2 text-right ${mutedCls}`}>
                          {formatDate(row.last_event_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <h4 className={`text-md font-semibold ${textCls} mb-3`}>Recent activity</h4>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className={`text-sm ${mutedCls}`}>No recent events.</p>
            ) : (
              recentEvents.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${rowBorder} ${dark ? 'bg-gray-900/40' : 'bg-gray-50'}`}
                >
                  <div className="shrink-0 h-9 w-9">
                    {row.avatar_url ? (
                      <img src={row.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${textCls}`}>
                      {row.display_name || row.username || 'Unknown user'}
                    </p>
                    <p className={`text-xs truncate ${mutedCls}`}>
                      {eventLabel(row)}
                      {row.subscription_tier ? ` · ${row.subscription_tier}` : ''}
                    </p>
                  </div>
                  <time className={`text-xs shrink-0 ${mutedCls}`}>{formatDate(row.created_at)}</time>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
