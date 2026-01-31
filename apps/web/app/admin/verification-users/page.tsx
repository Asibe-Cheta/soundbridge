'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';

type VerificationUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
};

export default function VerificationUsersAdminPage() {
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('unverified');
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Verification Approvals</h1>
            <p className="text-sm text-gray-500">Manage verification badges for users.</p>
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="">All</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="username or display name"
            />
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white"
            onClick={loadUsers}
          >
            Apply filters
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="text-sm text-gray-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {user.display_name || user.username || user.id}
                      </div>
                      <div className="text-xs text-gray-500">{user.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {user.is_verified ? 'verified' : 'unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_verified ? (
                        <button
                          className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-800"
                          onClick={() => updateVerification(user.id, false)}
                        >
                          Remove badge
                        </button>
                      ) : (
                        <button
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white"
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
              <div className="p-6 text-center text-sm text-gray-500">No users found.</div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
