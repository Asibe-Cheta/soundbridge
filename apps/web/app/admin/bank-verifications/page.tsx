'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Landmark, Loader2, RefreshCw } from 'lucide-react';

import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type VerifiedBankAccount = {
  bank_account_id: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  account_holder_name: string | null;
  bank_name: string | null;
  currency: string | null;
  country_code: string | null;
  verification_rail: string | null;
  is_verified: boolean;
  verification_status: string | null;
  verified_at: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  account_last4: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Summary = {
  total_verified: number;
  by_currency: Record<string, number>;
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const railLabel = (rail: string | null) => {
  if (rail === 'stripe') return 'Stripe Connect';
  if (rail === 'fincra') return 'Fincra (local bank)';
  if (rail === 'bank') return 'Bank account';
  return rail ?? '—';
};

function StatCard({
  theme,
  label,
  value,
}: {
  theme: string;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

export default function BankVerificationsAdminPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [accounts, setAccounts] = useState<VerifiedBankAccount[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const currencyOptions = useMemo(() => {
    const keys = Object.keys(summary?.by_currency ?? {}).sort();
    return keys;
  }, [summary]);

  const load = useCallback(
    async (opts?: { nextPage?: number; nextSearch?: string; nextCurrency?: string }) => {
      setLoading(true);
      setError(null);

      const nextPage = opts?.nextPage ?? page;
      const nextSearch = opts?.nextSearch ?? search;
      const nextCurrency = opts?.nextCurrency ?? currency;

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
      });
      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      if (nextCurrency.trim()) params.set('currency', nextCurrency.trim());

      try {
        const res = await fetchWithSupabaseAuth(`/api/admin/bank-verifications?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || 'Failed to load verified bank accounts');
        }

        setAccounts(payload.data ?? []);
        setSummary(payload.summary ?? null);
        setPage(payload.pagination?.page ?? nextPage);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.totalPages ?? 1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load verified bank accounts');
      } finally {
        setLoading(false);
      }
    },
    [page, search, currency],
  );

  useEffect(() => {
    void load();
  }, []);

  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <ProtectedRoute>
      <div className={`min-h-screen p-4 md:p-8 space-y-6 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={`flex items-center gap-2 ${textClass}`}>
              <Landmark size={22} className="text-green-500" />
              <h1 className="text-2xl font-bold">Verified bank accounts</h1>
            </div>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              Creators who have completed bank verification — all countries and payout rails.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
              dark ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard theme={theme} label="Total verified" value={summary.total_verified} />
            {currencyOptions.slice(0, 3).map((cur) => (
              <StatCard key={cur} theme={theme} label={cur} value={summary.by_currency[cur] ?? 0} />
            ))}
          </div>
        )}

        <div className={`rounded-xl border ${cardClass} p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email, username, bank name, currency…"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  dark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All currencies</option>
                {currencyOptions.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  void load({ nextPage: 1, nextSearch: search, nextCurrency: currency });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg font-medium ${
                  dark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className={`overflow-x-auto rounded-xl border ${cardClass} shadow`}>
          <table className={`min-w-full divide-y text-sm ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={dark ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
              <tr>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>User</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Bank / holder</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Country / currency</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Rail</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Verified</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Profile</th>
              </tr>
            </thead>
            <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-10 text-center ${mutedClass}`}>
                    <Loader2 className="inline animate-spin mr-2" size={16} />
                    Loading verified accounts…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-10 text-center ${mutedClass}`}>
                    No verified bank accounts found for these filters.
                  </td>
                </tr>
              ) : (
                accounts.map((row) => {
                  const profileLabel = row.display_name || row.username || row.email;
                  const profileHref = row.username ? `/creator/${row.username}` : null;
                  return (
                    <tr key={row.bank_account_id}>
                      <td className={`px-4 py-3 ${textClass}`}>
                        <div className="font-medium">{row.email || '—'}</div>
                        {row.username && (
                          <div className={`text-xs ${mutedClass}`}>@{row.username}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{row.bank_name || '—'}</div>
                        <div className={`text-xs ${mutedClass}`}>
                          {row.account_holder_name || '—'}
                          {row.account_last4 ? ` · ···${row.account_last4}` : ''}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{row.country_code || '—'}</div>
                        <div className={`text-xs ${mutedClass}`}>{row.currency || '—'}</div>
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {railLabel(row.verification_rail)}
                        {row.stripe_account_id && (
                          <div className={`text-xs truncate max-w-[160px] ${mutedClass}`} title={row.stripe_account_id}>
                            {row.stripe_account_status || row.stripe_account_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            dark ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <CheckCircle2 size={12} />
                          {row.verification_status || (row.is_verified ? 'verified' : '—')}
                        </span>
                        <div className={`text-xs mt-1 ${mutedClass}`}>{formatDateTime(row.verified_at || row.updated_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {profileHref ? (
                          <Link
                            href={profileHref}
                            className={`inline-flex items-center gap-1 text-sm font-medium ${
                              dark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            {profileLabel}
                            <ExternalLink size={14} />
                          </Link>
                        ) : (
                          <span className={mutedClass}>{profileLabel}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              className={`flex items-center justify-between px-4 py-3 border-t text-sm ${
                dark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'
              }`}
            >
              <span>
                Page {page} of {totalPages} · {total} verified
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => void load({ nextPage: page - 1 })}
                  className={`px-3 py-1.5 rounded border ${
                    dark ? 'border-gray-600 disabled:opacity-40' : 'border-gray-300 disabled:opacity-40'
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => void load({ nextPage: page + 1 })}
                  className={`px-3 py-1.5 rounded border ${
                    dark ? 'border-gray-600 disabled:opacity-40' : 'border-gray-300 disabled:opacity-40'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
