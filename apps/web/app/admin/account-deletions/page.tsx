'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';

type AccountDeletionRequest = {
  id: string;
  user_id: string;
  reason: string;
  detail: string | null;
  created_at: string;
  processed_at: string | null;
  status: 'pending' | 'processed' | 'cancelled';
  requested_by_ip: string | null;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  email?: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function AccountDeletionsAdminPage() {
  const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/account-deletions');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load requests');
      }
      setRequests(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'cancel' | 'process_now') => {
    try {
      setProcessing(requestId);
      setError(null);
      const response = await fetch('/api/admin/account-deletions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update request');
      }
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Account Deletions</h1>
            <p className="text-sm text-gray-500">Manage deletion requests and retention actions.</p>
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
            onClick={loadRequests}
          >
            Refresh
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="text-sm text-gray-500">Loading requests...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Requested</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Processed</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {request.profile?.display_name || request.profile?.username || request.user_id}
                      </div>
                      <div className="text-xs text-gray-500">{request.email || 'Email unavailable'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{request.reason}</div>
                      {request.detail && <div className="text-xs text-gray-500">{request.detail}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(request.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(request.processed_at)}</td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                            onClick={() => handleAction(request.id, 'process_now')}
                            disabled={processing === request.id}
                          >
                            Process now
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-800"
                            onClick={() => handleAction(request.id, 'cancel')}
                            disabled={processing === request.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">No deletion requests found.</div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
