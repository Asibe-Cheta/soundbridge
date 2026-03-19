import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { getMinPayoutForCurrency, MIN_PAYOUT_NON_WISE_USD } from '@/src/lib/payout-minimum';

/** Safe eligibility payload when something goes wrong (never 5xx). */
function ineligiblePayload(reasons: string[], minPayout: number = MIN_PAYOUT_NON_WISE_USD): Record<string, unknown> {
  return {
    success: true,
    eligible: false,
    reasons: reasons.length ? reasons : ['Unable to determine eligibility'],
    min_payout: minPayout,
    has_bank_account: false,
    bank_account_verified: false,
    eligibility: {
      eligible: false,
      reasons: reasons.length ? reasons : ['Unable to determine eligibility'],
      min_payout: minPayout,
      has_bank_account: false,
      bank_account_verified: false,
    },
  };
}

/**
 * Payout eligibility for the current user. No creator role required — any authenticated user
 * can have a verified bank account and balance; eligibility = verified bank + sufficient balance.
 * Never throws: always returns 200 with { eligible, reasons, ... } (or 401 if not authenticated).
 * @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { supabase, user, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const reasons: string[] = [];
    let eligible = true;
    let available_balance: number | null = null;
    let pending_requests: number | null = null;
    let withdrawable_amount: number | null = null;
    let has_bank_account = false;
    let bank_account_verified = false;
    let bank_currency: string | null = null;
    let min_payout = MIN_PAYOUT_NON_WISE_USD;

    try {
      // 1. Check for at least one verified bank account and get currency for min_payout
      const service = createServiceClient();
      const { data: bankAccounts, error: bankError } = await service
        .from('creator_bank_accounts')
        .select('id, is_verified, currency')
        .eq('user_id', user.id);

      if (bankError) {
        console.error('Error fetching bank accounts for eligibility:', bankError);
        reasons.push('Unable to verify bank account');
        eligible = false;
      } else {
        const accounts = bankAccounts ?? [];
        has_bank_account = accounts.length > 0;
        const verified = accounts.filter((b) => b.is_verified === true);
        bank_account_verified = verified.length > 0;
        if (verified.length > 0 && verified[0].currency) {
          bank_currency = verified[0].currency;
        } else if (accounts.length > 0 && (accounts[0] as { currency?: string }).currency) {
          bank_currency = (accounts[0] as { currency: string }).currency;
        }
        if (!bank_account_verified) {
          reasons.push('No verified bank account');
          eligible = false;
        }
        min_payout = getMinPayoutForCurrency(bank_currency);
      }

      // 2. Get balance/eligibility from RPC (pass bank currency for currency-aware min_payout)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_payout_eligibility', {
        p_creator_id: user.id,
        p_bank_currency: bank_currency ?? null,
      });

      if (rpcError) {
        console.error('Error from get_payout_eligibility:', rpcError);
        if (eligible) {
          reasons.push('Unable to determine balance');
          eligible = false;
        }
      } else if (rpcData) {
        const bal = rpcData.available_balance ?? 0;
        const pending = rpcData.pending_requests ?? 0;
        const withdrawable = rpcData.withdrawable_amount ?? Math.max(0, Number(bal) - Number(pending));
        min_payout = Number(rpcData.min_payout) ?? min_payout;
        const canRequest = rpcData.can_request_payout === true;

        available_balance = Number(bal);
        pending_requests = Number(pending);
        withdrawable_amount = Number(withdrawable);

        if (eligible && !canRequest) {
          reasons.push('Insufficient balance');
          eligible = false;
        }
      }
    } catch (e) {
      console.error('Unexpected error in payout eligibility:', e);
      if (reasons.length === 0) reasons.push('Unable to determine eligibility');
      eligible = false;
    }

    const payload = {
      eligible,
      reasons,
      has_bank_account,
      bank_account_verified,
      can_request_payout: eligible,
      ...(available_balance != null && { available_balance }),
      ...(pending_requests != null && { pending_requests }),
      min_payout,
      ...(withdrawable_amount != null && { withdrawable_amount }),
    };

    return NextResponse.json({
      success: true,
      eligibility: payload,
      ...payload,
    });
  } catch (e) {
    // Top-level safety: auth or any uncaught throw → still 200 with ineligible (mobile must never see 5xx)
    console.error('Payout eligibility handler error:', e);
    return NextResponse.json(ineligiblePayload(['Unable to determine eligibility'], MIN_PAYOUT_NON_WISE_USD), { status: 200 });
  }
}
