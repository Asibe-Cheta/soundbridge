'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';

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
  const { theme } = useTheme();
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
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
          <div>
            <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Account Deletions</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Manage deletion requests and retention actions.</p>
          </div>
          <button
            className={`px-3 py-2 text-sm rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
            onClick={loadRequests}
          >
            Refresh
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        {loading ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading requests...</div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
            <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>User</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Reason</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Requested</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Processed</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {request.profile?.display_name || request.profile?.username || request.user_id}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{request.email || 'Email unavailable'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{request.reason}</div>
                      {request.detail && <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{request.detail}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(request.created_at)}</td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(request.processed_at)}</td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                            onClick={() => handleAction(request.id, 'process_now')}
                            disabled={processing === request.id}
                          >
                            Process now
                          </button>
                          <button
                            className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                            onClick={() => handleAction(request.id, 'cancel')}
                            disabled={processing === request.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <div className={`p-6 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No deletion requests found.</div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
