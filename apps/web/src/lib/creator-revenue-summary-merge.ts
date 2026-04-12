import type { SupabaseClient } from '@supabase/supabase-js';
import type { RevenueSummary } from '@/src/lib/types/revenue';

function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * creator_revenue row + get_creator_revenue_summary can lag behind tip_analytics and
 * user_wallets. Withdrawals use user_wallets — align "Available" with wallet balance
 * and fix Total Earned when CR row is still zero but tips/sales exist.
 */
export async function mergeCreatorRevenueSummaryWithWallet(
  supabase: SupabaseClient,
  userId: string,
  row: Record<string, unknown>
): Promise<RevenueSummary> {
  const totalEarnedCr = toNum(row.total_earned);
  const totalTips = toNum(row.total_tips);
  const totalTrackSales = toNum(row.total_track_sales);
  const totalSubscriptions = toNum(row.total_subscriptions);
  const availableCr = toNum(row.available_balance);

  const { data: wallets } = await supabase
    .from('user_wallets')
    .select('balance, currency')
    .eq('user_id', userId);

  let walletUsd = 0;
  if (wallets?.length) {
    const usdRow = wallets.find((w) => String((w as { currency?: string }).currency || '').toUpperCase() === 'USD');
    if (usdRow != null && (usdRow as { balance?: unknown }).balance != null) {
      walletUsd = toNum((usdRow as { balance?: unknown }).balance);
    } else {
      walletUsd = toNum((wallets[0] as { balance?: unknown }).balance);
    }
  }

  const sumFromBreakdown = totalTips + totalTrackSales + totalSubscriptions;
  /** When creator_revenue was never updated, fall back to sum of RPC breakdown columns. */
  const totalEarned = totalEarnedCr > 0.005 ? totalEarnedCr : sumFromBreakdown;

  return {
    total_earned: totalEarned,
    total_paid_out: toNum(row.total_paid_out),
    pending_balance: toNum(row.pending_balance),
    available_balance: Math.max(availableCr, walletUsd),
    this_month_earnings: toNum(row.this_month_earnings),
    last_month_earnings: toNum(row.last_month_earnings),
    total_tips: totalTips,
    total_track_sales: totalTrackSales,
    total_subscriptions: totalSubscriptions,
  };
}
