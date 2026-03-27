'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';

type ClaimsSummary = {
  totalMembers: number;
  claimedMembers: number;
  unclaimedMembers: number;
  claimRatePercent: number;
  recentClaims24h: number;
};

type CohortAccountStats = {
  cohortSize: number;
  withAccount: number;
  withoutAccount: number;
  accountRatePercent: number;
};

type CohortMemberRow = {
  founding_member_id: string;
  email: string;
  waitlist_signed_up_at: string;
  has_account: boolean;
  account_created_at: string | null;
};

type CohortAccountPayload = {
  cohortLimit: number;
  stats: CohortAccountStats | null;
  members: CohortMemberRow[];
  error?: string;
};

type FoundingMemberRow = {
  id: string;
  email: string;
  waitlist_signed_up_at: string;
  first_claimed_at: string | null;
  last_claimed_at: string | null;
  claim_count: number;
};

type ClaimEvent = {
  id: string;
  email: string;
  founding_member_id: string | null;
  found: boolean;
  claimed_at: string;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const CLAIM_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'unclaimed', label: 'Unclaimed' },
] as const;

export default function FoundingMembersAdminPage() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);
  const [cohortAccount, setCohortAccount] = useState<CohortAccountPayload | null>(null);
  const [members, setMembers] = useState<FoundingMemberRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<ClaimEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [search, setSearch] = useState('');
  const [cohortLimit, setCohortLimit] = useState(101);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadClaimsData = async (opts?: {
    nextPage?: number;
    nextStatus?: 'all' | 'claimed' | 'unclaimed';
    nextSearch?: string;
  }) => {
    const nextPage = opts?.nextPage ?? page;
    const nextStatus = opts?.nextStatus ?? status;
    const nextSearch = opts?.nextSearch ?? search;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
        status: nextStatus,
        eventLimit: '25',
        cohortLimit: String(cohortLimit),
      });

      if (nextSearch.trim()) {
        params.append('search', nextSearch.trim());
      }

      const response = await fetch(`/api/admin/founding-members/claims?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to load founding member claims');
      }

      setSummary(result.summary || null);
      setCohortAccount(result.cohortAccount || null);
      setMembers(result.data || []);
      setRecentEvents(result.recentEvents || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
      setPage(nextPage);
      setStatus(nextStatus);
      setSearch(nextSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load founding member claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaimsData({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Founding Member Claims
              </h1>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Monitor founding-member claim checks, and how many of the first cohort (by waitlist order) have created
                a SoundBridge account (matched by email to auth).
              </p>
            </div>
            <button
              className={`px-3 py-2 text-sm rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
              onClick={() => loadClaimsData({ nextPage: page })}
            >
              Refresh
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard theme={theme} label="Total Members" value={summary.totalMembers} />
            <StatCard theme={theme} label="Claimed" value={summary.claimedMembers} />
            <StatCard theme={theme} label="Unclaimed" value={summary.unclaimedMembers} />
            <StatCard theme={theme} label="Claim Rate" value={`${summary.claimRatePercent}%`} />
            <StatCard theme={theme} label="Claims (24h)" value={summary.recentClaims24h} />
          </div>
        )}

        {cohortAccount?.error && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              theme === 'dark' ? 'bg-amber-950/40 border-amber-800 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            Cohort account stats: {cohortAccount.error}
          </div>
        )}

        {cohortAccount?.stats && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Cohort: accounts created (first {cohortAccount.cohortLimit} by waitlist)
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  “Claimed” above counts visits to the founding-member check. This section counts real accounts (email
                  match in auth), independent of claim.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cohort size
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={cohortLimit}
                  onChange={(e) => setCohortLimit(Math.min(500, Math.max(1, parseInt(e.target.value || '101', 10) || 101)))}
                  className={`w-24 px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => loadClaimsData({ nextPage: page })}
                  className={`px-3 py-2 text-sm rounded ${
                    theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard theme={theme} label="Cohort size" value={cohortAccount.stats.cohortSize} />
              <StatCard theme={theme} label="With account" value={cohortAccount.stats.withAccount} />
              <StatCard theme={theme} label="No account yet" value={cohortAccount.stats.withoutAccount} />
              <StatCard theme={theme} label="Account rate" value={`${cohortAccount.stats.accountRatePercent}%`} />
            </div>
          </div>
        )}

        {cohortAccount?.stats && cohortAccount.members.length > 0 && (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-900'} font-medium`}>
              Cohort members (detail)
            </div>
            <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Email
                  </th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Waitlist signup
                  </th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Has account
                  </th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Account created
                  </th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                {cohortAccount.members.map((row) => (
                  <tr key={row.founding_member_id}>
                    <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{row.email}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDateTime(row.waitlist_signed_up_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          row.has_account
                            ? theme === 'dark'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-green-100 text-green-700'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.has_account ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {row.has_account ? formatDateTime(row.account_created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</label>
              <select
                value={status}
                onChange={(e) => loadClaimsData({ nextPage: 1, nextStatus: e.target.value as 'all' | 'claimed' | 'unclaimed', nextSearch: search })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {CLAIM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Search Email</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadClaimsData({ nextPage: 1, nextStatus: status, nextSearch: search })}
                className={`w-full px-3 py-2 text-sm rounded ${
                  theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
          <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
              <tr>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Claims</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>First Claimed</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Last Claimed</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Waitlist Signup</th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Loading founding member claims...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No founding members found for these filters.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{member.email}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{member.claim_count}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{formatDateTime(member.first_claimed_at)}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{formatDateTime(member.last_claimed_at)}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatDateTime(member.waitlist_signed_up_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className={`px-4 py-3 border-t flex items-center justify-between text-sm ${theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            <span>
              Showing page {page} of {Math.max(totalPages, 1)} ({total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadClaimsData({ nextPage: Math.max(page - 1, 1), nextStatus: status, nextSearch: search })}
                disabled={page <= 1 || loading}
                className={`px-3 py-1 rounded border disabled:opacity-50 ${
                  theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => loadClaimsData({ nextPage: Math.min(page + 1, totalPages), nextStatus: status, nextSearch: search })}
                disabled={page >= totalPages || loading}
                className={`px-3 py-1 rounded border disabled:opacity-50 ${
                  theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
          <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-900'} font-medium`}>
            Recent Claim Events
          </div>
          <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
              <tr>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Claimed At</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Found</th>
                <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Source</th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-4 py-6 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No claim events yet.
                  </td>
                </tr>
              ) : (
                recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{formatDateTime(event.claimed_at)}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{event.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.found
                            ? theme === 'dark'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-green-100 text-green-700'
                            : theme === 'dark'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {event.found ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{event.source || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ theme, label, value }: { theme: string; label: string; value: number | string }) {
  return (
    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
