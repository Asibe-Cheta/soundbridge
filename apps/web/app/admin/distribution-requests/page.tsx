'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { CheckCircle, Clock, Music, PoundSterling, RefreshCw, XCircle } from 'lucide-react';

type DistributionRequest = {
  id: string;
  artist_name: string;
  track_title: string;
  genre: string | null;
  requested_release_date: string;
  created_at: string;
  amount_paid: number;
  payment_status: string;
  partner_email_status: string;
  rejection_reason: string | null;
  track_status: string;
  distribution_cover_art_url: string | null;
  explicit_content: boolean;
  creator?: { display_name?: string | null; username?: string | null };
  track?: { cover_art_url?: string | null } | null;
};

type Summary = {
  distributions_this_month: number;
  total_revenue: number;
  pending_review: number;
  partner_emails_sent: number;
  rejected: number;
};

const formatDate = (v: string) => {
  try {
    return new Date(v).toLocaleDateString('en-GB');
  } catch {
    return v;
  }
};

const money = (n: number) => `£${Number(n).toFixed(2)}`;

const partnerStatusLabel = (status: string) => {
  switch (status) {
    case 'pending_review':
      return 'Pending review';
    case 'sent':
      return 'Sent to MBG Sonics';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

export default function AdminDistributionRequestsPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [requests, setRequests] = useState<DistributionRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithSupabaseAuth('/api/admin/distribution-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setSummary(json.summary ?? null);
      setRequests(json.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    if (!confirm('Approve cover art and send this request to MBG Sonics?')) return;
    setActingId(id);
    try {
      const res = await fetchWithSupabaseAuth(`/api/admin/distribution-requests/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed');
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = rejectReason.trim();
    if (!reason) {
      alert('Please enter a rejection reason for the creator.');
      return;
    }
    if (!confirm('Reject this request, refund the creator, and notify them by email?')) return;
    setActingId(id);
    try {
      const res = await fetchWithSupabaseAuth(`/api/admin/distribution-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed');
      }
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const markLive = async (id: string) => {
    setActingId(id);
    try {
      const res = await fetchWithSupabaseAuth(`/api/admin/distribution-requests/${id}/mark-live`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed');
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const coverUrl = (r: DistributionRequest) =>
    r.distribution_cover_art_url || r.track?.cover_art_url || null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${text}`}>Distribution Requests</h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Review cover art before sending to MBG Sonics. Check for logos, release dates, URLs, and
            explicit imagery.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${
            dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error ? <p className="mb-4 text-red-500">{error}</p> : null}

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'This month', value: summary.distributions_this_month, icon: Music },
            { label: 'Total revenue', value: money(summary.total_revenue), icon: PoundSterling },
            { label: 'Pending review', value: summary.pending_review, icon: Clock },
            { label: 'Sent to partner', value: summary.partner_emails_sent, icon: CheckCircle },
            { label: 'Rejected', value: summary.rejected, icon: XCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className={`rounded-lg border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${muted}`} />
                <span className={`text-sm ${muted}`}>{label}</span>
              </div>
              <p className={`text-2xl font-bold ${text}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className={muted}>Loading…</p>
      ) : requests.length === 0 ? (
        <p className={muted}>No distribution requests yet.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const name = r.creator?.display_name || r.creator?.username || r.artist_name;
            const cover = coverUrl(r);
            const canReview = r.partner_email_status === 'pending_review';
            const canMarkLive =
              r.partner_email_status === 'sent' &&
              r.track_status !== 'live' &&
              r.track_status !== 'failed';

            return (
              <div key={r.id} className={`rounded-lg border p-4 ${card}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="shrink-0">
                    {cover ? (
                      <a href={cover} target="_blank" rel="noopener noreferrer">
                        <img
                          src={cover}
                          alt={`Cover art for ${r.track_title}`}
                          className="w-40 h-40 object-cover rounded border border-gray-600"
                        />
                      </a>
                    ) : (
                      <div
                        className={`w-40 h-40 rounded border flex items-center justify-center text-xs ${muted}`}
                      >
                        No cover
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <h2 className={`font-semibold ${text}`}>{r.track_title}</h2>
                        <p className={`text-sm ${muted}`}>
                          {name} · {r.artist_name}
                          {r.genre ? ` · ${r.genre}` : ''}
                          {r.explicit_content ? ' · Explicit' : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          r.partner_email_status === 'pending_review'
                            ? 'bg-amber-500/20 text-amber-400'
                            : r.partner_email_status === 'sent'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {partnerStatusLabel(r.partner_email_status)}
                      </span>
                    </div>

                    <dl className={`grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-3 ${muted}`}>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">Submitted</dt>
                        <dd className={text}>{formatDate(r.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">Release date</dt>
                        <dd className={text}>{formatDate(r.requested_release_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">Paid</dt>
                        <dd className={text}>{money(r.amount_paid)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide">Track status</dt>
                        <dd className={text}>{r.track_status}</dd>
                      </div>
                    </dl>

                    {r.rejection_reason ? (
                      <p className="text-sm text-red-400 mb-3">Rejection: {r.rejection_reason}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {canReview ? (
                        <>
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => approve(r.id)}
                            className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve &amp; Send to MBG Sonics
                          </button>
                          <button
                            type="button"
                            disabled={actingId === r.id}
                            onClick={() => {
                              setRejectingId(rejectingId === r.id ? null : r.id);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {canMarkLive ? (
                        <button
                          type="button"
                          disabled={actingId === r.id}
                          onClick={() => markLive(r.id)}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Mark Live
                        </button>
                      ) : null}
                    </div>

                    {rejectingId === r.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for creator (e.g. cover contains a Spotify logo)"
                          rows={2}
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            dark
                              ? 'bg-gray-900 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={actingId === r.id}
                          onClick={() => reject(r.id)}
                          className="px-3 py-1.5 rounded bg-red-700 text-white text-sm hover:bg-red-800 disabled:opacity-50"
                        >
                          Confirm rejection &amp; refund
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
