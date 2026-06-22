'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MousePointerClick, RefreshCw } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { PARTNER_RESOURCE_NAMES } from '@/src/lib/pro-resource-analytics';

type SummaryCard = {
  partner_name: string;
  this_month: number;
  last_month: number;
  delta: number;
};

type ClickRow = {
  id: string;
  partner_name: string;
  clicked_at: string;
  display_name: string | null;
  username: string | null;
  user_id: string | null;
};

type DateRangeFilter = 'this_month' | 'last_7_days' | 'all';

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function creatorName(row: ClickRow): string {
  if (row.display_name?.trim()) return row.display_name.trim();
  if (row.username?.trim()) return row.username.trim();
  return 'Deleted user';
}

export function PartnerResourceClicksPanel({ theme }: { theme: string }) {
  const dark = theme === 'dark';
  const cardCls = `${dark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`;
  const mutedCls = dark ? 'text-gray-400' : 'text-gray-600';
  const textCls = dark ? 'text-white' : 'text-gray-900';
  const rowBorder = dark ? 'border-gray-700' : 'border-gray-200';
  const headCls = dark ? 'text-gray-300' : 'text-gray-600';

  const [summary, setSummary] = useState<SummaryCard[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('this_month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        partner: partnerFilter,
        range: dateRange,
        limit: '100',
      });
      const response = await fetchWithSupabaseAuth(
        `/api/admin/partner-resource-clicks?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load partner click analytics');
      }
      setSummary(data.summary || []);
      setClicks(data.clicks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner click analytics');
    } finally {
      setLoading(false);
    }
  }, [partnerFilter, dateRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-pink-600 text-white'
        : dark
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          <MousePointerClick className={`h-5 w-5 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${textCls}`}>Pro Resources — Partner Clicks</h3>
            <p className={`text-sm ${mutedCls}`}>
              Partner attribution from Pro Resources card taps (web + mobile)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {summary.map((card) => (
          <div
            key={card.partner_name}
            className={`rounded-xl border p-4 ${rowBorder} ${dark ? 'bg-gray-900/40' : 'bg-gray-50'}`}
          >
            <p className={`text-xs font-medium uppercase tracking-wide ${mutedCls}`}>
              {card.partner_name}
            </p>
            <p className={`text-2xl font-bold mt-1 ${textCls}`}>{card.this_month}</p>
            <p className={`text-xs mt-1 ${mutedCls}`}>clicks this month</p>
            <p
              className={`text-xs mt-2 font-medium ${
                card.delta > 0
                  ? 'text-emerald-500'
                  : card.delta < 0
                    ? 'text-red-400'
                    : mutedCls
              }`}
            >
              {card.delta > 0 ? '+' : ''}
              {card.delta} vs last month
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-xs font-medium self-center ${mutedCls}`}>Partner:</span>
        <button type="button" className={chipCls(partnerFilter === 'all')} onClick={() => setPartnerFilter('all')}>
          All
        </button>
        {PARTNER_RESOURCE_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            className={chipCls(partnerFilter === name)}
            onClick={() => setPartnerFilter(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <span className={`text-xs font-medium self-center ${mutedCls}`}>Date range:</span>
        {(
          [
            ['this_month', 'This month'],
            ['last_7_days', 'Last 7 days'],
            ['all', 'All time'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={chipCls(dateRange === value)}
            onClick={() => setDateRange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !clicks.length ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className={`ml-2 ${mutedCls}`}>Loading partner clicks…</span>
        </div>
      ) : error ? (
        <p className={`text-sm ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      ) : (
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className={`sticky top-0 z-10 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
              <tr className={`border-b ${rowBorder}`}>
                <th className={`text-left py-2 pr-4 font-medium ${headCls}`}>Creator name</th>
                <th className={`text-left py-2 px-2 font-medium ${headCls}`}>Username</th>
                <th className={`text-left py-2 px-2 font-medium ${headCls}`}>Partner</th>
                <th className={`text-right py-2 pl-2 font-medium ${headCls}`}>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {clicks.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`py-6 text-center ${mutedCls}`}>
                    No partner clicks for this filter yet.
                  </td>
                </tr>
              ) : (
                clicks.map((row) => (
                  <tr key={row.id} className={`border-b ${rowBorder}`}>
                    <td className={`py-3 pr-4 ${textCls}`}>{creatorName(row)}</td>
                    <td className={`py-3 px-2 ${mutedCls}`}>
                      {row.username ? `@${row.username}` : '—'}
                    </td>
                    <td className={`py-3 px-2 ${textCls}`}>{row.partner_name}</td>
                    <td className={`py-3 pl-2 text-right ${mutedCls}`}>
                      {formatDateTime(row.clicked_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
