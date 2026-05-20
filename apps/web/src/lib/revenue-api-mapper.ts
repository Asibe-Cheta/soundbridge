import type { RevenueSummary } from '@/src/lib/types/revenue';

/** CamelCase shape used by mobile app and /api/revenue/balance. */
export interface ClientRevenueSummary {
  totalEarned: number;
  totalPaidOut: number;
  pendingBalance: number;
  availableBalance: number;
  walletBalance: number;
  pendingPayoutRequests: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalTips: number;
  totalTrackSales: number;
  totalSubscriptions: number;
}

export function mapRevenueSummaryToClient(summary: RevenueSummary): ClientRevenueSummary {
  return {
    totalEarned: summary.total_earned,
    totalPaidOut: summary.total_paid_out,
    pendingBalance: summary.pending_balance,
    availableBalance: summary.available_balance,
    walletBalance: summary.wallet_balance ?? summary.available_balance,
    pendingPayoutRequests: summary.pending_payout_requests ?? 0,
    thisMonthEarnings: summary.this_month_earnings,
    lastMonthEarnings: summary.last_month_earnings,
    totalTips: summary.total_tips,
    totalTrackSales: summary.total_track_sales,
    totalSubscriptions: summary.total_subscriptions,
  };
}
