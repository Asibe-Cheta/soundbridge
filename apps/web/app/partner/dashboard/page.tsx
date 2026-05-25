'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type PartnerData = {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  total_subscribers_referred: number;
  total_commission_earned: number;
  pending_commission: number;
};

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPartner = async () => {
      try {
        const response = await fetchWithSupabaseAuth('/api/partners/me');
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load partner dashboard');
        setPartner(data.partner);
        setReferrals(data.referrals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load partner dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadPartner();
  }, []);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-semibold">Partner Dashboard</h1>
          <p className="mt-2 text-sm text-white/70">Track referrals, paid conversions, and commission.</p>

          {loading ? (
            <div className="mt-8 text-white/70">Loading partner dashboard...</div>
          ) : error ? (
            <div className="mt-8 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>
          ) : !partner ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/10 p-6">
              You do not have a partner record yet.
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-xl border border-white/10 bg-white/10 p-5">
                <div className="text-xs uppercase tracking-wide text-white/50">Your referral link</div>
                <div className="mt-2 break-all text-lg font-semibold">{partner.referral_link}</div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  ['Users referred', partner.total_referrals],
                  ['Paid conversions', partner.total_subscribers_referred],
                  ['Commission earned', `£${Number(partner.total_commission_earned || 0).toFixed(2)}`],
                  ['Pending payment', `£${Number(partner.pending_commission || 0).toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-5">
                    <div className="text-sm text-white/60">{label}</div>
                    <div className="mt-2 text-2xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/10 text-left text-white/60">
                    <tr>
                      <th className="px-4 py-3">Join date</th>
                      <th className="px-4 py-3">Paid status</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral) => (
                      <tr key={referral.id} className="border-t border-white/10">
                        <td className="px-4 py-3">{new Date(referral.signed_up_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{referral.converted_to_paid ? 'Converted' : 'Not yet'}</td>
                        <td className="px-4 py-3">{referral.subscription_tier || '-'}</td>
                        <td className="px-4 py-3">£{Number(referral.commission_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
