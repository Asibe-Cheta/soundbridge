'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Repeat } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type RetentionWindow = {
  window_days: number;
  cohort_size: number;
  retained_count: number;
  retention_rate: number;
};

const WINDOW_LABELS: Record<number, string> = {
  1: 'Day 1 Retention',
  7: 'Day 7 Retention',
  30: 'Day 30 Retention',
};

export function RetentionMetrics({ theme }: { theme: string }) {
  const dark = theme === 'dark';
  const cardCls = `${dark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`;
  const mutedCls = dark ? 'text-gray-400' : 'text-gray-600';
  const textCls = dark ? 'text-white' : 'text-gray-900';
  const statCardCls = `${dark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`;

  const [windows, setWindows] = useState<RetentionWindow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithSupabaseAuth('/api/admin/retention');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load retention metrics');
      }
      setWindows(data.windows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retention metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div className="flex items-center gap-2">
          <Repeat className={`h-5 w-5 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${textCls}`}>Returning Users</h3>
            <p className={`text-sm ${mutedCls}`}>
              % of users who opened the app again on or after each day, counting from their signup date
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm self-start"
        >
          Refresh
        </button>
      </div>

      {loading && !windows ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className={`ml-2 ${mutedCls}`}>Loading retention…</span>
        </div>
      ) : error ? (
        <p className={`text-sm ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      ) : windows ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {windows.map((w) => (
            <div key={w.window_days} className={statCardCls}>
              <p className={`text-sm ${mutedCls}`}>{WINDOW_LABELS[w.window_days] || `Day ${w.window_days} Retention`}</p>
              <p className={`text-2xl font-semibold mt-1 ${textCls}`}>{w.retention_rate}%</p>
              <p className={`text-xs mt-1 ${mutedCls}`}>
                {w.retained_count} of {w.cohort_size} eligible users
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
