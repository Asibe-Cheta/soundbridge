'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

interface VoteCampaignData {
  totals: Record<string, number>;
  byPushNumber: Record<string, number>;
  recent: { action: string; properties: any; timestamp: string }[];
}

const ACTION_LABELS: Record<string, string> = {
  vote_notification_tapped: 'Notification tapped',
  vote_now_tapped: 'Vote now tapped (link-out)',
  vote_link_copied: 'Link copied',
  vote_link_shared: 'Link shared',
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export default function VoteCampaignPage() {
  const [data, setData] = useState<VoteCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSupabaseAuth('/api/admin/vote-campaign');
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error || 'Failed to load vote campaign data');
        return;
      }
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h1 className="text-2xl font-semibold text-white">Vote for SoundBridge Campaign</h1>
          <p className="text-sm text-gray-400">
            In-app engagement with the Investec Early-Stage Entrepreneur of the Year public vote
            campaign — notification taps, link-outs to theeasies.com, copies, and shares.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-900/30 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : data ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(ACTION_LABELS).map(([action, label]) => (
                <StatCard key={action} label={label} value={data.totals[action] || 0} />
              ))}
            </div>

            <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Notification taps by push</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {['1', '2', '3', 'unknown'].map((key) => (
                  <div key={key} className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {key === 'unknown' ? 'Unknown push' : `Push ${key}`}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {(data.byPushNumber[key] || 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Recent activity</h2>
              {data.recent.length === 0 ? (
                <p className="text-sm text-gray-400">No events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Push #</th>
                        <th className="px-4 py-3">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-200">
                      {data.recent.map((event, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">{ACTION_LABELS[event.action] || event.action}</td>
                          <td className="px-4 py-3">{event.properties?.pushNumber ?? '—'}</td>
                          <td className="px-4 py-3">{new Date(event.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
