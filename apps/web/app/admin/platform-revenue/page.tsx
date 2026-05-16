'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import type { PlatformRevenueReport } from '@/src/lib/platform-revenue-admin';
import { Download, RefreshCw, TrendingUp, DollarSign, PieChart } from 'lucide-react';

type PeriodKey = '7d' | '30d' | 'month' | 'year' | 'custom';

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

function money(n: number, currency = 'USD') {
  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminPlatformRevenuePage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-gray-400' : 'text-gray-600';

  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [useYear, setUseYear] = useState(false);
  const [report, setReport] = useState<PlatformRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(0);
  const txPageSize = 25;

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (useYear && year) {
      p.set('year', year);
    } else if (period === 'custom') {
      p.set('period', 'custom');
      if (fromDate) p.set('from', fromDate);
      if (toDate) p.set('to', toDate);
    } else {
      p.set('period', period);
    }
    return p.toString();
  }, [period, fromDate, toDate, year, useYear]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithSupabaseAuth(`/api/admin/platform-revenue?${queryString}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load revenue report');
      }
      setReport(await res.json());
      setTxPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    const res = await fetchWithSupabaseAuth(`/api/admin/platform-revenue?${queryString}&export=csv`);
    if (!res.ok) {
      alert('CSV export failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-revenue-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const txs = report?.transactions ?? [];
  const txSlice = txs.slice(txPage * txPageSize, (txPage + 1) * txPageSize);
  const txPages = Math.max(1, Math.ceil(txs.length / txPageSize));

  return (
    <ProtectedRoute>
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className={`text-2xl font-bold ${text}`}>Platform revenue</h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Gross volume (fan payments) and SoundBridge&apos;s 15% platform fees by category. Data from{' '}
              <code className="text-xs">platform_revenue</code> (recorded at payment time).
            </p>
          </div>

          <div>
            <div className={`mt-6 p-4 rounded-lg border ${card} flex flex-wrap gap-4 items-end`}>
              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Period</label>
                <select
                  value={useYear ? 'year-picker' : period}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'year-picker') {
                      setUseYear(true);
                    } else {
                      setUseYear(false);
                      setPeriod(v as PeriodKey);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="year-picker">Specific year…</option>
                </select>
              </div>
              {useYear && (
                <div>
                  <label className={`block text-xs mb-1 ${muted}`}>Year</label>
                  <input
                    type="number"
                    min={2020}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={`px-3 py-2 rounded-lg border text-sm w-28 ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              )}
              {period === 'custom' && !useYear && (
                <>
                  <div>
                    <label className={`block text-xs mb-1 ${muted}`}>From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${muted}`}>To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Apply
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={loading || !report}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            {report?.period?.label && (
              <p className={`mt-2 text-sm ${muted}`}>Showing: {report.period.label}</p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm">{error}</div>
          )}

          {loading && <p className={`mt-8 ${muted}`}>Loading…</p>}

          {!loading && report && (
            <>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-lg border ${card}`}>
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Gross volume (all payments)</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>{money(report.totals.gross_total)}</p>
                  <p className={`text-xs mt-1 ${muted}`}>
                    {report.totals.transaction_count} transactions — tips, gigs, tickets, audio (before your 15% is
                    taken out of this in accounting)
                  </p>
                </div>
                <div className={`p-5 rounded-lg border ${card}`}>
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Platform revenue (15% fees)</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>{money(report.totals.platform_fee_total)}</p>
                  <p className={`text-xs mt-1 ${muted}`}>Realised SoundBridge share in this period</p>
                </div>
                <div className={`p-5 rounded-lg border ${card}`}>
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <PieChart className="h-5 w-5" />
                    <span className="text-sm font-medium">Creator share (85%)</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>{money(report.totals.creator_payout_total)}</p>
                  <p className={`text-xs mt-1 ${muted}`}>Credited to creator wallets (booked)</p>
                </div>
              </div>

              <div className={`mt-8 rounded-lg border overflow-hidden ${card}`}>
                <div className={`px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`font-semibold ${text}`}>By category</h2>
                  <p className={`text-xs ${muted}`}>
                    Gross = total paid by fans. Platform fee = your 15% cut from that category.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                      <tr>
                        <th className={`text-left px-4 py-2 ${muted}`}>Category</th>
                        <th className={`text-right px-4 py-2 ${muted}`}>Transactions</th>
                        <th className={`text-right px-4 py-2 ${muted}`}>Gross volume</th>
                        <th className={`text-right px-4 py-2 ${muted}`}>Platform fee (15%)</th>
                        <th className={`text-right px-4 py-2 ${muted}`}>Creator share (85%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_charge_type.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={`px-4 py-8 text-center ${muted}`}>
                            No transactions in this period
                          </td>
                        </tr>
                      ) : (
                        report.by_charge_type.map((row) => (
                          <tr key={row.charge_type} className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}>
                            <td className={`px-4 py-3 font-medium ${text}`}>{row.label}</td>
                            <td className={`px-4 py-3 text-right ${text}`}>{row.transaction_count}</td>
                            <td className={`px-4 py-3 text-right ${text}`}>{money(row.gross_total)}</td>
                            <td className="px-4 py-3 text-right text-green-400">{money(row.platform_fee_total)}</td>
                            <td className={`px-4 py-3 text-right ${muted}`}>{money(row.creator_payout_total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {report.by_charge_type.length > 0 && (
                      <tfoot className={dark ? 'bg-gray-900/80' : 'bg-gray-100'}>
                        <tr>
                          <td className={`px-4 py-3 font-bold ${text}`}>Total</td>
                          <td className={`px-4 py-3 text-right font-bold ${text}`}>{report.totals.transaction_count}</td>
                          <td className={`px-4 py-3 text-right font-bold ${text}`}>{money(report.totals.gross_total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-400">
                            {money(report.totals.platform_fee_total)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${muted}`}>
                            {money(report.totals.creator_payout_total)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className={`mt-8 rounded-lg border overflow-hidden ${card}`}>
                <div className={`px-4 py-3 border-b flex justify-between items-center ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <h2 className={`font-semibold ${text}`}>Transaction detail</h2>
                    <p className={`text-xs ${muted}`}>Each row = one payment with date and fee breakdown</p>
                  </div>
                  <span className={`text-xs ${muted}`}>
                    Page {txPage + 1} of {txPages} ({txs.length} rows)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className={`sticky top-0 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`text-left px-3 py-2 ${muted}`}>Date</th>
                        <th className={`text-left px-3 py-2 ${muted}`}>Category</th>
                        <th className={`text-right px-3 py-2 ${muted}`}>Gross</th>
                        <th className={`text-right px-3 py-2 ${muted}`}>Fee %</th>
                        <th className={`text-right px-3 py-2 ${muted}`}>Platform fee</th>
                        <th className={`text-right px-3 py-2 ${muted}`}>Creator</th>
                        <th className={`text-left px-3 py-2 ${muted}`}>Cur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txSlice.map((t) => (
                        <tr key={t.id} className={dark ? 'border-t border-gray-700' : 'border-t border-gray-100'}>
                          <td className={`px-3 py-2 whitespace-nowrap ${muted}`}>{formatDate(t.created_at)}</td>
                          <td className={`px-3 py-2 ${text}`}>{t.label}</td>
                          <td className={`px-3 py-2 text-right ${text}`}>{money(t.gross_display, t.currency)}</td>
                          <td className={`px-3 py-2 text-right ${muted}`}>{t.platform_fee_percent ?? 15}%</td>
                          <td className="px-3 py-2 text-right text-green-400">
                            {money(t.platform_fee_display, t.currency)}
                          </td>
                          <td className={`px-3 py-2 text-right ${muted}`}>
                            {money(t.creator_payout_display, t.currency)}
                          </td>
                          <td className={`px-3 py-2 ${muted}`}>{t.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {txPages > 1 && (
                  <div className={`px-4 py-3 flex gap-2 border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                      type="button"
                      disabled={txPage === 0}
                      onClick={() => setTxPage((p) => p - 1)}
                      className="px-3 py-1 text-sm rounded bg-gray-600 text-white disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={txPage >= txPages - 1}
                      onClick={() => setTxPage((p) => p + 1)}
                      className="px-3 py-1 text-sm rounded bg-gray-600 text-white disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
