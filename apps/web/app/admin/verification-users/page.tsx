'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type VerificationUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function VerificationUsersAdminPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('unverified');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadUsers = async (overrides?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const effectiveStatus = overrides?.status !== undefined ? overrides.status : status;
      const effectiveSearch = overrides?.search !== undefined ? overrides.search : search;
      const effectivePage = overrides?.page !== undefined ? overrides.page : page;
      const effectivePageSize = overrides?.pageSize !== undefined ? overrides.pageSize : pageSize;

      const params = new URLSearchParams();
      if (effectiveStatus) params.set('status', effectiveStatus);
      if (effectiveSearch) params.set('search', effectiveSearch);
      params.set('page', String(effectivePage));
      params.set('limit', String(effectivePageSize));

      const response = await fetchWithSupabaseAuth(`/api/admin/verification/users?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load users');
      }
      setUsers(data.data || []);
      setTotalCount(data.count ?? 0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilters = (nextStatus?: string, nextSearch?: string) => {
    setPage(1);
    loadUsers({ status: nextStatus, search: nextSearch, page: 1 });
  };

  const changePage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(clamped);
    loadUsers({ page: clamped });
  };

  const changePageSize = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
    loadUsers({ pageSize: nextSize, page: 1 });
  };

  /** Applies a verification change locally instead of re-fetching the whole page. */
  const applyLocalUpdate = (userIds: string[], isVerified: boolean) => {
    const idSet = new Set(userIds);
    setUsers((prev) => {
      if (status === 'verified' || status === 'unverified') {
        const stillMatches = status === 'verified' ? isVerified : !isVerified;
        if (!stillMatches) {
          const removed = prev.filter((u) => idSet.has(u.id)).length;
          if (removed > 0) setTotalCount((c) => Math.max(0, c - removed));
          return prev.filter((u) => !idSet.has(u.id));
        }
      }
      return prev.map((u) => (idSet.has(u.id) ? { ...u, is_verified: isVerified } : u));
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      userIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const updateVerification = async (userId: string, isVerified: boolean) => {
    try {
      const response = await fetchWithSupabaseAuth('/api/admin/verification/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_verified: isVerified }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update user');
      }
      applyLocalUpdate([userId], isVerified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const bulkUpdateVerification = async (isVerified: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkWorking(true);
    try {
      const response = await fetchWithSupabaseAuth('/api/admin/verification/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids, is_verified: isVerified }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update users');
      }
      applyLocalUpdate(ids, isVerified);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update users');
    } finally {
      setBulkWorking(false);
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === users.length ? new Set() : new Set(users.map((u) => u.id))));
  };

  const toggleSelectOne = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const allOnPageSelected = users.length > 0 && selectedIds.size === users.length;

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
            onClick={() => void loadUsers()}
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
                setStatus('verified');
                changeFilters('verified', search);
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
                setStatus('unverified');
                changeFilters('unverified', search);
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
                setStatus('');
                changeFilters('', search);
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
            <div>
              <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Per page</label>
              <select
                value={pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                className={`rounded px-3 py-2 text-sm ${theme === 'dark' ? 'bg-gray-900 border border-gray-700 text-white' : 'border border-gray-300 text-gray-900'}`}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => changeFilters(status, search)}
            >
              Apply filters
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-3 mb-4`}>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {selectedIds.size} selected
            </span>
            <button
              className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              disabled={bulkWorking}
              onClick={() => bulkUpdateVerification(true)}
            >
              {bulkWorking ? 'Working...' : 'Verify selected'}
            </button>
            <button
              className={`px-3 py-1.5 text-xs rounded disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              disabled={bulkWorking}
              onClick={() => bulkUpdateVerification(false)}
            >
              Remove badge from selected
            </button>
          </div>
        )}

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        {loading ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading users...</div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow`}>
            <table className={`min-w-full divide-y text-sm ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-gray-900/40 divide-gray-700' : 'bg-gray-50 divide-gray-200'}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all on this page"
                    />
                  </th>
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
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectOne(user.id)}
                        aria-label={`Select ${user.display_name || user.username}`}
                      />
                    </td>
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

            <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {totalCount === 0
                  ? 'No results'
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1.5 text-xs rounded border disabled:opacity-40 ${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  Previous
                </button>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={`px-3 py-1.5 text-xs rounded border disabled:opacity-40 ${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
