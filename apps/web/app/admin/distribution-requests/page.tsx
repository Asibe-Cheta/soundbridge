'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { CheckCircle, Globe, Music, PoundSterling, RefreshCw } from 'lucide-react';

type DistributionRequest = {
  id: string;
  artist_name: string;
  track_title: string;
  genre: string | null;
  requested_release_date: string;
  created_at: string;
  amount_paid: number;
  amount_owed_to_partner: number;
  email_sent_to_partner: boolean;
  track_status: string;
  payment_to_partner_status: string;
  creator?: { display_name?: string | null; username?: string | null };
};

type Summary = {
  distributions_this_month: number;
  total_revenue: number;
  total_owed_to_partner: number;
  total_paid_to_partner: number;
};

const formatDate = (v: string) => {
  try {
    return new Date(v).toLocaleDateString('en-GB');
  } catch {
    return v;
  }
};

const money = (n: number) => `£${Number(n).toFixed(2)}`;

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

  const markPartnerPaid = async (id: string) => {
    setActingId(id);
    try {
      const res = await fetchWithSupabaseAuth(
        `/api/admin/distribution-requests/${id}/mark-partner-paid`,
        { method: 'POST' },
      );
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-semibold ${text}`}>Distribution Requests</h1>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'This month', value: summary.distributions_this_month, icon: Music },
            { label: 'Total revenue', value: money(summary.total_revenue), icon: PoundSterling },
            { label: 'Owed to MBG Sonics', value: money(summary.total_owed_to_partner), icon: Globe },
            { label: 'Paid to partner', value: money(summary.total_paid_to_partner), icon: CheckCircle },
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
        <div className={`overflow-x-auto rounded-lg border ${card}`}>
          <table className="min-w-full text-sm">
            <thead className={dark ? 'bg-gray-900/50' : 'bg-gray-50'}>
              <tr>
                {[
                  'Creator',
                  'Track',
                  'Submitted',
                  'Release date',
                  'Paid',
                  'Owed',
                  'Email sent',
                  'Track status',
                  'Partner pay',
                  'Actions',
                ].map((h) => (
                  <th key={h} className={`px-3 py-3 text-left font-medium ${muted}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const name = r.creator?.display_name || r.creator?.username || r.artist_name;
                return (
                  <tr key={r.id} className={`border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className={`px-3 py-3 ${text}`}>{name}</td>
                    <td className={`px-3 py-3 ${text}`}>{r.track_title}</td>
                    <td className={`px-3 py-3 ${muted}`}>{formatDate(r.created_at)}</td>
                    <td className={`px-3 py-3 ${muted}`}>{formatDate(r.requested_release_date)}</td>
                    <td className={`px-3 py-3 ${text}`}>{money(r.amount_paid)}</td>
                    <td className={`px-3 py-3 ${text}`}>{money(r.amount_owed_to_partner)}</td>
                    <td className={`px-3 py-3 ${muted}`}>{r.email_sent_to_partner ? 'Yes' : 'No'}</td>
                    <td className={`px-3 py-3 ${text}`}>{r.track_status}</td>
                    <td className={`px-3 py-3 ${text}`}>{r.payment_to_partner_status}</td>
                    <td className="px-3 py-3 space-x-2 whitespace-nowrap">
                      {r.track_status !== 'live' ? (
                        <button
                          type="button"
                          disabled={actingId === r.id}
                          onClick={() => markLive(r.id)}
                          className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          Mark Live
                        </button>
                      ) : null}
                      {r.payment_to_partner_status !== 'paid' ? (
                        <button
                          type="button"
                          disabled={actingId === r.id}
                          onClick={() => markPartnerPaid(r.id)}
                          className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                        >
                          Mark Partner Paid
                        </button>
                      ) : null}
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
}
