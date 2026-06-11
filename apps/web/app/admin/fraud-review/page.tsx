'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Eye,
  CheckCircle,
  Ban,
  PauseCircle,
} from 'lucide-react';

type Summary = {
  accounts_flagged_this_month: number;
  payouts_on_hold: number;
  suspicious_plays_this_month: number;
};

type FraudRow = {
  id: string;
  creator_id: string;
  track_id: string | null;
  analysis_date: string;
  total_plays: number;
  unique_listeners: number;
  play_to_listener_ratio: number | null;
  platform_ratio: number | null;
  fraud_score: number;
  fraud_status: string;
  payout_held?: boolean;
  created_at: string;
  fraud_signals?: Record<string, unknown>;
  profiles?: { username?: string; display_name?: string } | null;
  audio_tracks?: { title?: string } | null;
};

type ManualRow = {
  track_id: string;
  track_title: string;
  creator_id: string;
  play_count: number;
  session_rows: number;
  unique_user_ids: number;
  unique_ip_addresses: number;
  avg_play_duration_seconds: number;
  session_coverage?: number;
  inflation_ratio?: number;
  likely_inflated?: boolean;
};

type Detail = {
  analysis: FraudRow | null;
  playsByUser: { user_id: string | null; count: number; avg_duration: number }[];
  playsByIp: { ip_address: string | null; count: number }[];
  timeline: { hour: string; count: number }[];
  recentPlays: Record<string, unknown>[];
};

const statusClass = (status: string, dark: boolean) => {
  if (status === 'hold') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'flagged') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'monitor') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  return dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800';
};

export default function AdminFraudReviewPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [flagged, setFlagged] = useState<FraudRow[]>([]);
  const [monitor, setMonitor] = useState<FraudRow[]>([]);
  const [manual, setManual] = useState<ManualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithSupabaseAuth('/api/admin/fraud-review');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load fraud review data');
      }
      const data = await res.json();
      setSummary(data.summary ?? null);
      setFlagged(data.flagged ?? []);
      setMonitor(data.monitor ?? []);
      setManual(data.high_play_manual_analysis ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const runAnalysis = async () => {
    try {
      setError(null);
      const res = await fetchWithSupabaseAuth('/api/admin/fraud-review?run=1');
      if (!res.ok) throw new Error('Analysis run failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed');
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetchWithSupabaseAuth(`/api/admin/fraud-review?id=${id}`);
      if (!res.ok) throw new Error('Failed to load detail');
      setDetail(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detail failed');
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (analysisId: string, action: 'approve' | 'withhold' | 'ban') => {
    try {
      setActionBusy(`${analysisId}:${action}`);
      setError(null);
      const res = await fetchWithSupabaseAuth('/api/admin/fraud-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Action failed');
      }
      setDetail(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const creatorLabel = (row: FraudRow) =>
    row.profiles?.display_name || row.profiles?.username || row.creator_id.slice(0, 8);

  const renderTable = (rows: FraudRow[], showActions: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
          <tr>
            <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Creator</th>
            <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Track</th>
            <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Plays</th>
            <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Listeners</th>
            <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Ratio</th>
            <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Score</th>
            <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Status</th>
            <th className={`text-left px-4 py-3 font-medium ${mutedClass}`}>Date</th>
            {showActions && <th className={`text-right px-4 py-3 font-medium ${mutedClass}`}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-t cursor-pointer ${dark ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}
              onClick={() => openDetail(row.id)}
            >
              <td className={`px-4 py-3 ${textClass}`}>{creatorLabel(row)}</td>
              <td className={`px-4 py-3 ${mutedClass}`}>{row.audio_tracks?.title ?? '—'}</td>
              <td className={`px-4 py-3 text-right ${textClass}`}>{row.total_plays.toLocaleString()}</td>
              <td className={`px-4 py-3 text-right ${textClass}`}>{row.unique_listeners.toLocaleString()}</td>
              <td className={`px-4 py-3 text-right ${textClass}`}>{row.play_to_listener_ratio ?? '—'}</td>
              <td className={`px-4 py-3 text-right font-medium ${textClass}`}>{row.fraud_score}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded text-xs ${statusClass(row.fraud_status, dark)}`}>
                  {row.fraud_status}
                </span>
              </td>
              <td className={`px-4 py-3 whitespace-nowrap ${mutedClass}`}>{row.analysis_date}</td>
              {showActions && (
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Approve payout"
                      disabled={Boolean(actionBusy)}
                      onClick={() => runAction(row.id, 'approve')}
                      className="p-1.5 rounded text-green-500 hover:bg-green-500/10 disabled:opacity-40"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Withhold payout"
                      disabled={Boolean(actionBusy)}
                      onClick={() => runAction(row.id, 'withhold')}
                      className="p-1.5 rounded text-amber-500 hover:bg-amber-500/10 disabled:opacity-40"
                    >
                      <PauseCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Ban account"
                      disabled={Boolean(actionBusy)}
                      onClick={() => runAction(row.id, 'ban')}
                      className="p-1.5 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Fraud Review</h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Play-count integrity — flagged creators and payout holds
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runAnalysis}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
              dark ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <ShieldAlert className="h-4 w-4" /> Run analysis
          </button>
          <button
            type="button"
            onClick={load}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
              dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${mutedClass}`} />
              <p className={`text-xs ${mutedClass}`}>Accounts flagged this month</p>
            </div>
            <p className={`text-2xl font-semibold ${textClass}`}>
              {summary.accounts_flagged_this_month.toLocaleString()}
            </p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Payouts on hold</p>
            <p className={`text-2xl font-semibold ${textClass}`}>{summary.payouts_on_hold.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Suspicious plays this month</p>
            <p className={`text-2xl font-semibold ${textClass}`}>
              {summary.suspicious_plays_this_month.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {manual.length > 0 && (
        <div className={`rounded-lg border mb-6 ${cardClass}`}>
          <div className={`p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`font-medium ${textClass}`}>High play-count manual analysis</h2>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              Top tracks by play_count — unique users, IPs, avg duration (last 90 days of sessions)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 ${mutedClass}`}>Track</th>
                  <th className={`text-right px-4 py-3 ${mutedClass}`}>play_count</th>
                  <th className={`text-right px-4 py-3 ${mutedClass}`}>Sessions</th>
                  <th className={`text-right px-4 py-3 ${mutedClass}`}>Unique users</th>
                  <th className={`text-right px-4 py-3 ${mutedClass}`}>Unique IPs</th>
                  <th className={`text-right px-4 py-3 ${mutedClass}`}>Avg duration (s)</th>
                  <th className={`text-left px-4 py-3 ${mutedClass}`}>Inflated?</th>
                </tr>
              </thead>
              <tbody>
                {manual.map((m) => (
                  <tr
                    key={m.track_id}
                    className={`border-t ${dark ? 'border-gray-700' : 'border-gray-100'} ${m.likely_inflated ? (dark ? 'bg-red-900/20' : 'bg-red-50') : ''}`}
                  >
                    <td className={`px-4 py-3 ${textClass}`}>{m.track_title}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>{m.play_count.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${mutedClass}`}>{m.session_rows.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>{m.unique_user_ids.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>{m.unique_ip_addresses.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${textClass}`}>{m.avg_play_duration_seconds}</td>
                    <td className={`px-4 py-3 ${m.likely_inflated ? 'text-red-500 font-medium' : mutedClass}`}>
                      {m.likely_inflated
                        ? `Yes (${m.inflation_ratio?.toLocaleString() ?? '?'}×)`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`rounded-lg border mb-6 ${cardClass}`}>
        <div className={`flex items-center gap-2 p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <ShieldAlert className={`h-4 w-4 ${mutedClass}`} />
          <h2 className={`font-medium ${textClass}`}>Flagged accounts</h2>
        </div>
        {loading ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>Loading…</div>
        ) : flagged.length === 0 ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>No flagged accounts. Run analysis after migration.</div>
        ) : (
          renderTable(flagged, true)
        )}
      </div>

      <div className={`rounded-lg border ${cardClass}`}>
        <div className={`flex items-center gap-2 p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <Eye className={`h-4 w-4 ${mutedClass}`} />
          <h2 className={`font-medium ${textClass}`}>Monitor</h2>
        </div>
        {monitor.length === 0 ? (
          <div className={`p-8 text-center text-sm ${mutedClass}`}>No accounts in monitor status.</div>
        ) : (
          renderTable(monitor, false)
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border ${cardClass}`}
          >
            <div className={`flex items-center justify-between p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`font-medium ${textClass}`}>Play detail</h3>
              <button type="button" onClick={() => setDetail(null)} className={`text-sm ${mutedClass}`}>
                Close
              </button>
            </div>
            {detailLoading ? (
              <div className={`p-8 text-center text-sm ${mutedClass}`}>Loading detail…</div>
            ) : detail?.analysis ? (
              <div className="p-4 space-y-4">
                <pre className={`text-xs overflow-x-auto p-3 rounded ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {JSON.stringify(detail.analysis.fraud_signals ?? {}, null, 2)}
                </pre>
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${textClass}`}>By user</h4>
                  <ul className={`text-sm space-y-1 ${mutedClass}`}>
                    {detail.playsByUser.slice(0, 15).map((u) => (
                      <li key={String(u.user_id)}>
                        {u.user_id ?? 'anonymous'} — {u.count} plays, avg {u.avg_duration}s
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${textClass}`}>By IP</h4>
                  <ul className={`text-sm space-y-1 ${mutedClass}`}>
                    {detail.playsByIp.slice(0, 15).map((ip) => (
                      <li key={String(ip.ip_address)}>
                        {ip.ip_address ?? 'unknown'} — {ip.count} plays
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${textClass}`}>Timeline (by hour)</h4>
                  <ul className={`text-sm flex flex-wrap gap-2 ${mutedClass}`}>
                    {detail.timeline.slice(-24).map((t) => (
                      <span key={t.hour} className={`px-2 py-1 rounded text-xs ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        {t.hour}: {t.count}
                      </span>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
