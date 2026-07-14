'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { InstitutionBadge, INSTITUTION_BADGE_OPTIONS } from '@/src/components/ui/InstitutionBadge';

interface BadgeUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  institution_badge: string | null;
}

function InstitutionBadgeAssignment() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BadgeUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ candidates: number; updated: any[]; skipped: any[] } | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetchWithSupabaseAuth(`/api/admin/partners/institution-badge?q=${encodeURIComponent(query.trim())}`);
        const data = await response.json();
        if (response.ok) {
          setResults(data.users || []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const setBadge = async (userId: string, badge: string | null) => {
    setSavingId(userId);
    setMessage(null);
    try {
      const response = await fetchWithSupabaseAuth('/api/admin/partners/institution-badge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, badge }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error || 'Failed to update badge');
        return;
      }
      setResults((prev) => prev.map((u) => (u.id === userId ? { ...u, institution_badge: data.profile.institution_badge } : u)));
      setMessage('Badge updated');
    } finally {
      setSavingId(null);
    }
  };

  const runBackfill = async () => {
    if (!window.confirm('Assign badges to every creator with active Institutional Access who doesn\'t already have one? This will not overwrite existing badges.')) {
      return;
    }
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const response = await fetchWithSupabaseAuth('/api/admin/partners/institution-badge/backfill', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error || 'Backfill failed');
        return;
      }
      setBackfillResult(data);
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">Institutional badges</h2>
      <p className="mb-4 text-sm text-gray-400">Assign or remove an institutional partner badge (Abbey Road Institute, Sound Academy) on a creator&apos;s profile.</p>

      <button
        onClick={runBackfill}
        disabled={backfilling}
        className="mb-4 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {backfilling ? 'Backfilling...' : 'Backfill from Institutional Access'}
      </button>

      {backfillResult && (
        <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300">
          <p>
            {backfillResult.candidates} active Institutional Access grant{backfillResult.candidates === 1 ? '' : 's'} found —{' '}
            {backfillResult.updated.length} badge{backfillResult.updated.length === 1 ? '' : 's'} assigned,{' '}
            {backfillResult.skipped.length} already had a badge (untouched).
          </p>
          {backfillResult.updated.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Assigned: {backfillResult.updated.map((u) => u.username).join(', ')}
            </p>
          )}
        </div>
      )}

      <input
        className="mb-4 block w-full max-w-md rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        placeholder="Search by username, display name, or email"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {message && <div className="mb-3 text-sm text-gray-300">{message}</div>}
      {searching && <div className="mb-3 text-sm text-gray-500">Searching...</div>}

      {results.length > 0 && (
        <div className="divide-y divide-gray-700 rounded-lg border border-gray-700">
          {results.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm text-white">{user.display_name || user.username}</span>
                <InstitutionBadge institutionBadge={user.institution_badge} size={16} />
                <span className="truncate text-xs text-gray-500">@{user.username}</span>
              </div>
              <select
                className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                value={user.institution_badge || ''}
                disabled={savingId === user.id}
                onChange={(event) => setBadge(user.id, event.target.value || null)}
              >
                <option value="">(none)</option>
                {INSTITUTION_BADGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: '', referralCode: '', commissionRate: '0.10' });

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithSupabaseAuth('/api/admin/partners');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load partners');
      setPartners(data.partners || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const createPartner = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetchWithSupabaseAuth('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: form.userId,
        referralCode: form.referralCode,
        commissionRate: Number(form.commissionRate),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error || 'Failed to create partner');
      return;
    }
    setForm({ userId: '', referralCode: '', commissionRate: '0.10' });
    await loadPartners();
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h1 className="text-2xl font-semibold text-white">Partners</h1>
          <p className="text-sm text-gray-400">Referral partners, conversions, and commission totals.</p>
        </div>

        <InstitutionBadgeAssignment />

        <form onSubmit={createPartner} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
          <label className="text-sm text-gray-300">
            User ID
            <input className="mt-1 block rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} />
          </label>
          <label className="text-sm text-gray-300">
            Referral code
            <input className="mt-1 block rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white" value={form.referralCode} onChange={(event) => setForm({ ...form, referralCode: event.target.value })} />
          </label>
          <label className="text-sm text-gray-300">
            Commission rate
            <input className="mt-1 block rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white" value={form.commissionRate} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} />
          </label>
          <button className="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">Create partner</button>
        </form>

        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-400">Loading partners...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/60 text-left text-gray-400">
                <tr>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Referral link</th>
                  <th className="px-4 py-3">Referrals</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-gray-200">
                {partners.map((partner) => (
                  <tr key={partner.id}>
                    <td className="px-4 py-3">{partner.profile?.display_name || partner.profile?.username || partner.user_id}</td>
                    <td className="px-4 py-3">{partner.referral_code}</td>
                    <td className="px-4 py-3 break-all">{partner.referral_link}</td>
                    <td className="px-4 py-3">{partner.total_referrals}</td>
                    <td className="px-4 py-3">{partner.total_subscribers_referred}</td>
                    <td className="px-4 py-3">£{Number(partner.total_commission_earned || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{new Date(partner.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
