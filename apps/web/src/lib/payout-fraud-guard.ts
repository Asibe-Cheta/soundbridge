/**
 * Payout fraud guard — block payouts for flagged/unreviewed creators.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PayoutFraudCheck = {
  blocked: boolean;
  reason?: string;
  creatorName?: string;
  fraudStatus?: string;
  analysisIds?: string[];
};

export async function checkCreatorPayoutFraud(
  service: SupabaseClient,
  creatorId: string,
): Promise<PayoutFraudCheck> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data: rows, error } = await service
    .from('creator_fraud_analysis')
    .select('id, fraud_status, reviewed_by_admin, admin_decision, payout_held, analysis_date')
    .eq('creator_id', creatorId)
    .gte('analysis_date', startOfMonth.toISOString().slice(0, 10))
    .in('fraud_status', ['flagged', 'hold']);

  if (error) {
    console.error('[payout-fraud-guard]', error);
    return { blocked: false };
  }

  const blocking = (rows ?? []).filter((r) => {
    if (r.admin_decision === 'approved') return false;
    if (r.admin_decision === 'withheld' || r.admin_decision === 'banned') return true;
    if ((r.fraud_status === 'flagged' || r.fraud_status === 'hold') && !r.reviewed_by_admin) return true;
    return Boolean(r.payout_held) && !r.reviewed_by_admin;
  });

  if (!blocking.length) return { blocked: false };

  const { data: profile } = await service
    .from('profiles')
    .select('display_name, username')
    .eq('id', creatorId)
    .maybeSingle();

  const name = profile?.display_name || profile?.username || creatorId;

  return {
    blocked: true,
    reason: `Payout blocked for ${name} pending fraud review.`,
    creatorName: name,
    fraudStatus: blocking[0]?.fraud_status,
    analysisIds: blocking.map((r) => r.id),
  };
}

export async function notifyAdminPayoutBlocked(
  service: SupabaseClient,
  creatorId: string,
  message: string,
): Promise<void> {
  const { data: admins } = await service
    .from('profiles')
    .select('id')
    .or('is_admin.eq.true,role.eq.admin,role.eq.super_admin')
    .limit(20);

  const rows = (admins ?? []).map((a) => ({
    user_id: a.id,
    type: 'admin_fraud',
    title: 'Payout blocked — fraud review',
    message,
    link: '/admin/fraud-review',
    read: false,
    created_at: new Date().toISOString(),
  }));

  if (rows.length) {
    await service.from('notifications').insert(rows);
  }
}
