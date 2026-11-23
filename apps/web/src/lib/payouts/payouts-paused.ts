import { NextResponse } from 'next/server';

/**
 * Emergency kill switch, added after finding that user_wallets.balance and
 * creator_bank_accounts.is_verified could be set directly by any
 * authenticated user (RLS only checked row ownership, never which columns),
 * and that payout routes trusted both without independent re-verification.
 * Defaults to PAUSED -- requires PAYOUTS_PAUSED=false to be explicitly set
 * once Stage 1's re-architecture (service-role reads, independent balance
 * recomputation, live bank re-verification) is in place.
 */
export function arePayoutsPaused(): boolean {
  return process.env.PAYOUTS_PAUSED !== 'false';
}

export function payoutsPausedResponse(extraHeaders?: HeadersInit): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Payouts are temporarily paused for a security review. Please check back shortly.',
    },
    { status: 503, headers: extraHeaders },
  );
}
