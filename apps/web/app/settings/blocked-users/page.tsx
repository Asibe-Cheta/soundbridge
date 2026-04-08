'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldOff, UserX } from 'lucide-react';

type BlockedUserRow = {
  id: string;
  reason: string | null;
  created_at: string;
  blocked: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function BlockedUsersPage() {
  const [rows, setRows] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/users/block?list=blocked', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load blocked users');
      setRows(data.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unblock = async (userId: string) => {
    const ok = window.confirm('Unblock this user?');
    if (!ok) return;
    try {
      setBusyUserId(userId);
      const res = await fetch(`/api/users/block?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to unblock user');
      setRows((prev) => prev.filter((r) => r.blocked?.id !== userId));
    } catch (e: any) {
      setError(e?.message || 'Failed to unblock user');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/settings" className="inline-flex items-center gap-2 text-gray-300 hover:text-white">
            <ArrowLeft size={16} /> Back to Settings
          </Link>
        </div>

        <div className="card mb-6">
          <div className="card-header">
            <h1 className="card-title text-2xl">Blocked Users</h1>
          </div>
          <p className="text-sm text-gray-400">
            Manage users you blocked. Unblocking allows them to interact with you again.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="text-gray-300">Loading blocked users...</div>
        ) : rows.length === 0 ? (
          <div className="card p-8 text-center">
            <ShieldOff className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-300">You have not blocked anyone.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const blocked = row.blocked;
              if (!blocked) return null;
              return (
                <div key={row.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {blocked.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={blocked.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <UserX size={16} className="text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{blocked.display_name || blocked.username || 'User'}</div>
                      {blocked.username && <div className="text-xs text-gray-400 truncate">@{blocked.username}</div>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => unblock(blocked.id)}
                    disabled={busyUserId === blocked.id}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm font-medium"
                  >
                    {busyUserId === blocked.id ? 'Unblocking...' : 'Unblock'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

