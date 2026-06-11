'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { Briefcase, RefreshCw, Search, DollarSign, Users, AlertTriangle, Download } from 'lucide-react';

type Summary = {
  total_opportunities: number;
  active_opportunities: number;
  opportunities_this_month: number;
  urgent_opportunities: number;
  opportunities_by_type: Record<string, number>;
  total_interests: number;
  total_paid_projects: number;
  completed_projects: number;
  disputed_projects: number;
  escrowed_opportunity_posts: number;
  platform_transactions: number;
  volume_by_currency: {
    currency: string;
    gross: number;
    platform_fees: number;
    creator_payouts: number;
    transaction_count: number;
  }[];
};

type TransactionRow = {
  id: string;
  gig_title: string;
  opportunity_type: string | null;
  gig_type: string;
  requester_display_name: string | null;
  creator_display_name: string | null;
  creator_country: string | null;
  gross_amount: number;
  platform_fee: number;
  creator_earnings: number;
  currency: string;
  payment_status: string;
  project_status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  released: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  escrowed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  cancelled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const formatDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');
const formatMoney = (n: number, currency: string) => {
  const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : '$';
  return `${sym}${Number(n).toFixed(2)}`;
};

export default function AdminGigsOpportunitiesPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
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
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithSupabaseAuth(`/api/admin/gigs-opportunities?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load gigs data');
      }

      const data = await res.json();
      setSummary(data.summary ?? null);
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('export', 'csv');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithSupabaseAuth(`/api/admin/gigs-opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gig-transactions-${dateFrom || 'all'}.csv`;
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Gigs & Opportunities</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Opportunity volume and paid gig transaction activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/gig-payments"
            className={`text-sm px-3 py-2 rounded border ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Escrow actions →
          </Link>
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
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className={`h-4 w-4 ${mutedClass}`} />
                <p className={`text-xs ${mutedClass}`}>Opportunities posted</p>
              </div>
              <p className={`text-2xl font-semibold ${textClass}`}>
                {summary.total_opportunities.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${mutedClass}`}>
                {summary.active_opportunities} active · {summary.opportunities_this_month} this month
              </p>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <p className={`text-xs ${mutedClass}`}>Interests submitted</p>
              <p className={`text-2xl font-semibold ${textClass}`}>
                {summary.total_interests.toLocaleString()}
              </p>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <p className={`text-xs ${mutedClass}`}>Paid projects</p>
              <p className={`text-2xl font-semibold ${textClass}`}>
                {summary.total_paid_projects.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${mutedClass}`}>{summary.completed_projects} completed</p>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <p className={`text-xs ${mutedClass}`}>Urgent gigs</p>
              <p className={`text-2xl font-semibold ${textClass}`}>
                {summary.urgent_opportunities.toLocaleString()}
              </p>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-4 w-4 ${mutedClass}`} />
                <p className={`text-xs ${mutedClass}`}>In escrow / disputes</p>
              </div>
              <p className={`text-2xl font-semibold ${textClass}`}>{summary.escrowed_opportunity_posts}</p>
              <p className={`text-xs mt-1 ${mutedClass}`}>{summary.disputed_projects} disputed</p>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className={`h-4 w-4 ${mutedClass}`} />
                <p className={`text-xs ${mutedClass}`}>Platform transactions</p>
              </div>
              <p className={`text-2xl font-semibold ${textClass}`}>{summary.platform_transactions}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <p className={`text-sm font-medium ${textClass} mb-2`}>By opportunity type</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(summary.opportunities_by_type).map(([type, count]) => (
                  <span key={type} className={mutedClass}>
                    <span className={`font-medium ${textClass}`}>{count}</span> {type}
                  </span>
                ))}
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${cardClass}`}>
              <p className={`text-sm font-medium ${textClass} mb-2`}>Transaction volume</p>
              {summary.volume_by_currency.length ? (
                summary.volume_by_currency.map((v) => (
                  <p key={v.currency} className={`text-sm ${mutedClass}`}>
                    <span className={`font-medium ${textClass}`}>{v.transaction_count}</span> tx · Gross{' '}
                    {formatMoney(v.gross, v.currency)} · Fees {formatMoney(v.platform_fees, v.currency)}
                  </p>
                ))
              ) : (
                <p className={`text-sm ${mutedClass}`}>No recorded gig payments yet</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className={`rounded-lg border ${cardClass}`}>
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-2">
            <Users className={`h-4 w-4 ${mutedClass}`} />
            <h2 className={`font-medium ${textClass}`}>Gig transactions</h2>
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
                  {preset === '7d' ? '7 days' : preset === '30d' ? '30 days' : preset === 'month' ? 'This month' : 'All time'}
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
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="escrowed">Escrowed</option>
              <option value="released">Released</option>
              <option value="disputed">Disputed</option>
              <option value="pending">Pending</option>
            </select>
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
                  placeholder="Search gig, user…"
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
        ) : transactions.length === 0 ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>No gig transactions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>When</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Gig</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Type</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Requester</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Creator</th>
                  <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Gross</th>
                  <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Fee</th>
                  <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap ${textClass}`}>
                      {formatDate(tx.completed_at || tx.created_at)}
                    </td>
                    <td className={`px-4 py-3 ${textClass}`}>
                      <span className="font-medium">{tx.gig_title}</span>
                      {tx.stripe_payment_intent_id && (
                        <a
                          href={`https://dashboard.stripe.com/payments/${tx.stripe_payment_intent_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-500 hover:underline mt-0.5"
                        >
                          Stripe →
                        </a>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${mutedClass}`}>
                      {tx.opportunity_type ?? '—'}
                      {tx.gig_type === 'urgent' && (
                        <span className="ml-1 text-xs text-amber-500">urgent</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${mutedClass}`}>{tx.requester_display_name ?? '—'}</td>
                    <td className={`px-4 py-3 ${mutedClass}`}>
                      {tx.creator_display_name ?? '—'}
                      {tx.creator_country ? ` (${tx.creator_country})` : ''}
                    </td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>
                      {formatMoney(tx.gross_amount, tx.currency)}
                    </td>
                    <td className={`px-4 py-3 text-right ${mutedClass}`}>
                      {formatMoney(tx.platform_fee, tx.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[tx.payment_status] ?? STATUS_COLORS.pending}`}
                      >
                        {tx.payment_status}
                      </span>
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
              Page {page + 1} of {totalPages} · {total.toLocaleString()} transactions
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
