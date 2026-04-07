'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Copy, Loader2, RefreshCcw, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';

export type PersonaVerificationAdminRow = {
  userId: string;
  username: string | null;
  profileDisplayName: string | null;
  avatarUrl: string | null;
  providerDisplayName: string | null;
  headline: string | null;
  verificationStatus: string;
  isVerified: boolean;
  verifiedAt: string | null;
  verificationProvider: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  session: {
    inquiryId: string;
    sessionStatus: string;
    submittedAt: string | null;
    completedAt: string | null;
    updatedAt: string | null;
  } | null;
};

function formatDt(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const statusTone: Record<string, 'success' | 'warning' | 'critical' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  needs_review: 'warning',
  rejected: 'critical',
  declined: 'critical',
  not_requested: 'default',
};

const AdminPersonaVerificationDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PersonaVerificationAdminRow[]>([]);
  const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const response = await fetch(`/api/admin/service-providers/persona-verification?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load Persona verifications');
      }
      setRows(data.providers ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const thClass = isDark ? 'text-left text-xs font-semibold text-gray-400 pb-2 pr-4' : 'text-left text-xs font-semibold text-gray-600 pb-2 pr-4';
  const tdClass = isDark ? 'text-sm text-gray-200 py-3 pr-4 align-top' : 'text-sm text-gray-800 py-3 pr-4 align-top';
  const cardClass = isDark ? 'rounded-xl border border-gray-700 bg-gray-800/50 p-6' : 'rounded-xl border border-gray-200 bg-white p-6';

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className={`${cardClass} mb-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Persona (provider verification)</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Service providers who started or completed Persona. Profile status and dates sync from webhooks; inquiry id matches Persona
              dashboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={`text-sm rounded-lg border px-3 py-2 ${
                isDark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All</option>
              <option value="pending">Pending / in progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected / declined</option>
            </select>
            <input
              type="search"
              placeholder="Search name, username, user id, inquiry…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`text-sm rounded-lg border px-3 py-2 min-w-[200px] ${
                isDark ? 'bg-gray-900 border-gray-600 text-white placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <button
              type="button"
              onClick={() => load()}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
              }`}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            isDark ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Loader2 size={20} className="animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No Persona verification activity yet.</p>
      ) : (
        <div className={`overflow-x-auto ${cardClass}`}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-600/30">
                <th className={thClass}>User</th>
                <th className={thClass}>Profile status</th>
                <th className={thClass}>Verified at</th>
                <th className={thClass}>Requested / reviewed</th>
                <th className={thClass}>Persona inquiry</th>
                <th className={thClass}>Session status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const display = r.providerDisplayName || r.profileDisplayName || r.username || r.userId.slice(0, 8);
                const tone = statusTone[r.verificationStatus] ?? 'default';
                const sessionTone = r.session ? statusTone[r.session.sessionStatus] ?? 'default' : 'default';
                return (
                  <tr key={r.userId} className={`border-b ${isDark ? 'border-gray-700/80' : 'border-gray-100'}`}>
                    <td className={tdClass}>
                      <div className="flex items-start gap-2">
                        {r.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-gray-700' : 'bg-gray-200'
                            }`}
                          >
                            <User size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{display}</div>
                          {r.username && <div className="text-xs opacity-70">@{r.username}</div>}
                          <div className="text-xs font-mono opacity-60 mt-0.5">{r.userId}</div>
                          {r.headline && <div className="text-xs opacity-70 mt-1 max-w-[240px]">{r.headline}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center gap-1">
                        {r.verificationStatus === 'approved' ? (
                          <ShieldCheck size={14} className="text-green-500" />
                        ) : r.verificationStatus === 'pending' ? (
                          <Clock size={14} className="text-amber-500" />
                        ) : r.verificationStatus === 'rejected' ? (
                          <ShieldAlert size={14} className="text-red-400" />
                        ) : (
                          <CheckCircle size={14} className="text-gray-400" />
                        )}
                        <span
                          className={
                            tone === 'success'
                              ? 'text-green-400'
                              : tone === 'warning'
                                ? 'text-amber-400'
                                : tone === 'critical'
                                  ? 'text-red-400'
                                  : isDark
                                    ? 'text-gray-400'
                                    : 'text-gray-600'
                          }
                        >
                          {r.verificationStatus}
                        </span>
                      </span>
                      {r.verificationProvider && (
                        <div className="text-xs opacity-60 mt-1">via {r.verificationProvider}</div>
                      )}
                      {r.isVerified && <div className="text-xs text-green-500/90 mt-0.5">is_verified on profile</div>}
                    </td>
                    <td className={tdClass}>{formatDt(r.verifiedAt)}</td>
                    <td className={tdClass}>
                      <div className="text-xs space-y-1">
                        <div>Req: {formatDt(r.verificationRequestedAt)}</div>
                        <div>Rev: {formatDt(r.verificationReviewedAt)}</div>
                      </div>
                    </td>
                    <td className={tdClass}>
                      {r.session ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <code className="text-xs font-mono break-all max-w-[200px]">{r.session.inquiryId}</code>
                          <button
                            type="button"
                            onClick={() => copyId(r.session!.inquiryId)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            title="Copy inquiry id"
                          >
                            <Copy size={14} />
                          </button>
                          {copied === r.session.inquiryId && (
                            <span className="text-xs text-green-500">Copied</span>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {r.session ? (
                        <span
                          className={
                            sessionTone === 'success'
                              ? 'text-green-400'
                              : sessionTone === 'warning'
                                ? 'text-amber-400'
                                : sessionTone === 'critical'
                                  ? 'text-red-400'
                                  : isDark
                                    ? 'text-gray-300'
                                    : 'text-gray-700'
                          }
                        >
                          {r.session.sessionStatus}
                        </span>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                      {r.session?.submittedAt && (
                        <div className="text-xs opacity-60 mt-1">Submitted {formatDt(r.session.submittedAt)}</div>
                      )}
                      {r.session?.completedAt && (
                        <div className="text-xs opacity-60">Completed {formatDt(r.session.completedAt)}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPersonaVerificationDashboard;
