'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

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
