'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import {
  formatUserGrowthAxisDate,
  formatUserGrowthTooltipDate,
  type UserGrowthDayPoint,
  type UserGrowthMilestone,
  type UserGrowthStats,
} from '@/src/lib/user-growth-trend';

type Payload = {
  series: UserGrowthDayPoint[];
  stats: UserGrowthStats;
  milestones: UserGrowthMilestone[];
};

function useWeeklyTickStep(): number {
  const [step, setStep] = useState(7);

  useEffect(() => {
    const update = () => setStep(window.innerWidth < 640 ? 14 : 7);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return step;
}

export function UserGrowthTrendChart({ theme }: { theme: string }) {
  const dark = theme === 'dark';
  const cardCls = `${dark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`;
  const mutedCls = dark ? 'text-gray-400' : 'text-gray-600';
  const textCls = dark ? 'text-white' : 'text-gray-900';
  const statCardCls = `${dark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`;
  const gradientId = useId();
  const tickStep = useWeeklyTickStep();

  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithSupabaseAuth('/api/admin/user-growth-trend');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load user growth trend');
      }
      setPayload({
        series: data.series || [],
        stats: data.stats,
        milestones: data.milestones || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user growth trend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const xTicks = useMemo(() => {
    if (!payload?.series.length) return [];
    const ticks: string[] = [];
    payload.series.forEach((point, index) => {
      if (index % tickStep === 0 || index === payload.series.length - 1) {
        ticks.push(point.date);
      }
    });
    return ticks;
  }, [payload?.series, tickStep]);

  const maxY = payload?.series.length
    ? Math.max(...payload.series.map((point) => point.cumulative), 1)
    : 1;

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-5 w-5 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${textCls}`}>User Growth Since Launch</h3>
            <p className={`text-sm ${mutedCls}`}>Cumulative registrations from 1 Apr 2026</p>
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

      {loading && !payload ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className={`ml-2 ${mutedCls}`}>Loading user growth…</span>
        </div>
      ) : error ? (
        <p className={`text-sm ${dark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      ) : payload ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={statCardCls}>
              <p className={`text-sm ${mutedCls}`}>Total Users Today</p>
              <p className={`text-2xl font-semibold mt-1 ${textCls}`}>{payload.stats.totalToday}</p>
            </div>
            <div className={statCardCls}>
              <p className={`text-sm ${mutedCls}`}>This Month</p>
              <p className={`text-2xl font-semibold mt-1 ${textCls}`}>{payload.stats.thisMonth}</p>
            </div>
            <div className={statCardCls}>
              <p className={`text-sm ${mutedCls}`}>Daily Average</p>
              <p className={`text-2xl font-semibold mt-1 ${textCls}`}>{payload.stats.dailyAverage}</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {payload.series.length === 0 ? (
              <div className={`h-full flex items-center justify-center ${mutedCls}`}>No user data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payload.series} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="date"
                    ticks={xTicks}
                    tickFormatter={formatUserGrowthAxisDate}
                    stroke={dark ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 11 }}
                    minTickGap={8}
                  />
                  <YAxis
                    domain={[0, Math.ceil(maxY * 1.08)]}
                    allowDecimals={false}
                    tickFormatter={(value) => String(Math.round(Number(value)))}
                    stroke={dark ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 11 }}
                    width={48}
                  />
                  <Tooltip
                    content={({ active, payload: tooltipPayload }) => {
                      if (!active || !tooltipPayload?.length) return null;
                      const point = tooltipPayload[0]?.payload as UserGrowthDayPoint | undefined;
                      if (!point) return null;
                      return (
                        <div
                          className={`px-3 py-2 rounded-lg text-xs shadow-lg ${
                            dark
                              ? 'bg-gray-900 text-gray-100 border border-gray-700'
                              : 'bg-white text-gray-700 border border-gray-200'
                          }`}
                        >
                          <div className={`${mutedCls} mb-1`}>
                            Date: {formatUserGrowthTooltipDate(point.date)}
                          </div>
                          <div className="font-semibold">Total Users: {point.cumulative}</div>
                          <div className={mutedCls}>New Today: {point.new_today}</div>
                        </div>
                      );
                    }}
                  />
                  {payload.milestones.map((milestone) => (
                    <ReferenceLine
                      key={`${milestone.date}-${milestone.label}`}
                      x={milestone.date}
                      stroke={dark ? '#f472b6' : '#ec4899'}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    >
                      <Label
                        value={milestone.label}
                        position="top"
                        fill={dark ? '#f9a8d4' : '#db2777'}
                        fontSize={11}
                        offset={8}
                      />
                    </ReferenceLine>
                  ))}
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#EC4899"
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 4, fill: '#DC2626', stroke: '#fff', strokeWidth: 1 }}
                    isAnimationActive
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
