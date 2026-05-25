'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

export default function AdminInstitutionalAccessPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (institution) params.set('institution', institution);
      const response = await fetchWithSupabaseAuth(`/api/admin/institutional-access?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load institutional access');
      setRows(data.institutionalAccess || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load institutional access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h1 className="text-2xl font-semibold text-white">Institutional Access</h1>
          <p className="text-sm text-gray-400">Sound Academy and future institutional Premium grants.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
          <label className="text-sm text-gray-300">
            Institution
            <input
              className="mt-1 block rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white"
              placeholder="sound_academy"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
            />
          </label>
          <button onClick={loadAccess} className="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">Apply filter</button>
        </div>

        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-400">Loading institutional access...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/60 text-left text-gray-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Granted</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-gray-200">
                {rows.map((row) => {
                  const expired = new Date(row.expires_at).getTime() < Date.now();
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.profile?.display_name || row.profile?.username || row.user_id}</td>
                      <td className="px-4 py-3">{row.institution}</td>
                      <td className="px-4 py-3">{row.access_tier}</td>
                      <td className="px-4 py-3">{new Date(row.granted_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{new Date(row.expires_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{row.is_active && !expired ? 'Active' : 'Expired'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
