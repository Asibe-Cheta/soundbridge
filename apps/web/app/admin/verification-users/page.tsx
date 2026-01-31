'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';

type VerificationUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
};

export default function VerificationUsersAdminPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('unverified');
  const [search, setSearch] = useState('');

  const loadUsers = async (nextStatus?: string, nextSearch?: string) => {
    try {
      setLoading(true);
      setError(null);
      const effectiveStatus = nextStatus !== undefined ? nextStatus : status;
      const effectiveSearch = nextSearch !== undefined ? nextSearch : search;
      const params = new URLSearchParams();
      if (effectiveStatus) params.set('status', effectiveStatus);
      if (effectiveSearch) params.set('search', effectiveSearch);

      const response = await fetch(`/api/admin/verification/users?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load users');
      }
      setUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateVerification = async (userId: string, isVerified: boolean) => {
    try {
      const response = await fetch('/api/admin/verification/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_verified: isVerified }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update user');
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 mb-6`}>
          <div>
            <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Verification Badges</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Review verified users and approve or remove badges.</p>
          </div>
          <button
            className={`px-3 py-2 text-sm rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>

        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4 mb-4`}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              className={`px-3 py-1.5 text-xs rounded-full border ${
                status === 'verified'
                  ? theme === 'dark'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : theme === 'dark'
                    ? 'border-gray-700 text-gray-300 hover:text-white'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => {
                const nextStatus = 'verified';
                setStatus(nextStatus);
                loadUsers(nextStatus, search);
              }}
            >
              Verified users
            </button>
            <button
              className={`px-3 py-1.5 text-xs rounded-full border ${
                status === 'unverified'
                  ? theme === 'dark'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : theme === 'dark'
                    ? 'border-gray-700 text-gray-300 hover:text-white'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => {
                const nextStatus = 'unverified';
                setStatus(nextStatus);
                loadUsers(nextStatus, search);
              }}
            >
              Pending verification
            </button>
            <button
              className={`px-3 py-1.5 text-xs rounded-full border ${
                status === ''
                  ? theme === 'dark'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : theme === 'dark'
                    ? 'border-gray-700 text-gray-300 hover:text-white'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => {
                const nextStatus = '';
                setStatus(nextStatus);
                loadUsers(nextStatus, search);
              }}
            >
              All users
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`rounded px-3 py-2 text-sm ${theme === 'dark' ? 'bg-gray-900 border border-gray-700 text-white' : 'border border-gray-300 text-gray-900'}`}
            >
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="">All</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`rounded px-3 py-2 text-sm ${theme === 'dark' ? 'bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500' : 'border border-gray-300 text-gray-900'}`}
              placeholder="username or display name"
            />
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={loadUsers}
          >
            Apply filters
          </button>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        {loading ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading users...</div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
            <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
                <tr>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>User</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Created</th>
                  <th className={`px-4 py-3 text-left font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Action</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user.display_name || user.username || user.id}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                        {user.is_verified ? 'verified' : 'unverified'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_verified ? (
                        <button
                          className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                          onClick={() => updateVerification(user.id, false)}
                        >
                          Remove badge
                        </button>
                      ) : (
                        <button
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          onClick={() => updateVerification(user.id, true)}
                        >
                          Verify user
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className={`p-6 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No users found.</div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
