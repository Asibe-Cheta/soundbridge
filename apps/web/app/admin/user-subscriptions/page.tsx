'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleDollarSign, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type UserSubscription = {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  profile_tier: string | null;
  profile_status: string | null;
  legacy_tier: string | null;
  legacy_status: string | null;
  effective_tier: string;
  billing_cycle: string | null;
  early_adopter: boolean;
  subscription_start_date: string | null;
  subscription_renewal_date: string | null;
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_source: string;
  created_at: string | null;
  updated_at: string | null;
};

type Summary = {
  total_subscribed: number;
  by_tier: Record<string, number>;
  by_status: Record<string, number>;
};

const TIER_OPTIONS = [
  { value: 'all', label: 'All plans' },
  { value: 'premium', label: 'Premium' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'free', label: 'Free' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'past_due', label: 'Past due' },
  { value: 'trialing', label: 'Trialing' },
] as const;

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const tierLabel = (tier: string | null) => {
  if (!tier || tier === 'free') return 'Free';
  if (tier === 'premium' || tier === 'pro') return 'Premium';
  if (tier === 'unlimited' || tier === 'enterprise') return 'Unlimited';
  return tier;
};

const sourceLabel = (source: string) => {
  if (source === 'stripe') return 'Stripe';
  if (source === 'early_adopter') return 'Early adopter grant';
  if (source === 'mobile_or_manual') return 'Mobile / manual';
  if (source === 'legacy_table') return 'Legacy subscription row';
  return source;
};

const tierBadgeClass = (tier: string, dark: boolean) => {
  if (tier === 'unlimited') {
    return dark ? 'bg-purple-900/50 text-purple-200' : 'bg-purple-100 text-purple-800';
  }
  if (tier === 'premium' || tier === 'pro') {
    return dark ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800';
  }
  return dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';
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

export default function UserSubscriptionsAdminPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [paidOnly, setPaidOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const tierBreakdown = useMemo(() => Object.keys(summary?.by_tier ?? {}).sort(), [summary]);

  const load = useCallback(
    async (opts?: {
      nextPage?: number;
      nextSearch?: string;
      nextTier?: string;
      nextStatus?: string;
      nextPaidOnly?: boolean;
    }) => {
      setLoading(true);
      setError(null);

      const nextPage = opts?.nextPage ?? page;
      const nextSearch = opts?.nextSearch ?? search;
      const nextTier = opts?.nextTier ?? tier;
      const nextStatus = opts?.nextStatus ?? status;
      const nextPaidOnly = opts?.nextPaidOnly ?? paidOnly;

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
        paid_only: String(nextPaidOnly),
      });
      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      if (nextTier !== 'all') params.set('tier', nextTier);
      if (nextStatus !== 'all') params.set('status', nextStatus);

      try {
        const res = await fetchWithSupabaseAuth(`/api/admin/user-subscriptions?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || 'Failed to load subscriptions');
        }

        setSubscriptions(payload.data ?? []);
        setSummary(payload.summary ?? null);
        setPage(payload.pagination?.page ?? nextPage);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.totalPages ?? 1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
      } finally {
        setLoading(false);
      }
    },
    [page, search, tier, status, paidOnly],
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
              <CircleDollarSign size={22} className="text-blue-500" />
              <h1 className="text-2xl font-bold">Subscribed users</h1>
            </div>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              Platform subscription plans from profiles and billing records (Stripe, mobile, and manual grants).
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
            <StatCard theme={theme} label="Paid subscribers" value={summary.total_subscribed} />
            {tierBreakdown.slice(0, 3).map((plan) => (
              <StatCard key={plan} theme={theme} label={tierLabel(plan)} value={summary.by_tier[plan] ?? 0} />
            ))}
          </div>
        )}

        <div className={`rounded-xl border ${cardClass} p-4 space-y-3`}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email, username, Stripe ID…"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  dark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>Plan</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {TIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  void load({ nextPage: 1, nextSearch: search, nextTier: tier, nextStatus: status, nextPaidOnly: paidOnly });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg font-medium ${
                  dark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Apply filters
              </button>
            </div>
          </div>
          <label className={`inline-flex items-center gap-2 text-sm ${mutedClass}`}>
            <input
              type="checkbox"
              checked={paidOnly}
              onChange={(e) => setPaidOnly(e.target.checked)}
              className="rounded border-gray-400"
            />
            Show paid subscribers only
          </label>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className={`overflow-x-auto rounded-xl border ${cardClass} shadow`}>
          <table className={`min-w-full divide-y text-sm ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={dark ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
              <tr>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>User</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Plan</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Status</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Billing</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Renewal</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Source</th>
                <th className={`px-4 py-3 text-left font-medium ${mutedClass}`}>Profile</th>
              </tr>
            </thead>
            <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${mutedClass}`}>
                    <Loader2 className="inline animate-spin mr-2" size={16} />
                    Loading subscriptions…
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${mutedClass}`}>
                    No subscribers found for these filters.
                  </td>
                </tr>
              ) : (
                subscriptions.map((row) => {
                  const profileLabel = row.display_name || row.username || row.email;
                  const profileHref = row.username ? `/creator/${row.username}` : null;
                  const effectiveStatus = (row.profile_status || row.legacy_status || 'active').toLowerCase();

                  return (
                    <tr key={row.user_id}>
                      <td className={`px-4 py-3 ${textClass}`}>
                        <div className="font-medium">{row.email || '—'}</div>
                        {row.username && <div className={`text-xs ${mutedClass}`}>@{row.username}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${tierBadgeClass(row.effective_tier, dark)}`}
                        >
                          {tierLabel(row.effective_tier)}
                        </span>
                        {(row.profile_tier || row.legacy_tier) && (
                          <div className={`text-xs mt-1 ${mutedClass}`}>
                            {row.profile_tier ? `Profile: ${tierLabel(row.profile_tier)}` : null}
                            {row.profile_tier && row.legacy_tier ? ' · ' : null}
                            {row.legacy_tier ? `Legacy: ${tierLabel(row.legacy_tier)}` : null}
                          </div>
                        )}
                        {row.early_adopter && (
                          <div className={`text-xs mt-1 ${dark ? 'text-amber-300' : 'text-amber-700'}`}>Early adopter</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 capitalize ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {effectiveStatus}
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="capitalize">{row.billing_cycle || '—'}</div>
                        <div className={`text-xs ${mutedClass}`}>Started {formatDateTime(row.subscription_start_date)}</div>
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {formatDateTime(row.subscription_renewal_date || row.subscription_ends_at)}
                      </td>
                      <td className={`px-4 py-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{sourceLabel(row.billing_source)}</div>
                        {row.stripe_subscription_id && (
                          <div className={`text-xs truncate max-w-[140px] ${mutedClass}`} title={row.stripe_subscription_id}>
                            {row.stripe_subscription_id}
                          </div>
                        )}
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
                Page {page} of {totalPages} · {total} rows
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
