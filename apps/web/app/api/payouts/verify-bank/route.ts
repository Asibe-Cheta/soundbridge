/**
 * POST /api/payouts/verify-bank
 * Resolve account name via Fincra (WEB_TEAM_FINCRA_INTEGRATION.MD).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { inferCurrencyFromAfricanCountry, validateFincraBankAccount } from '@/src/lib/fincra';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    const { user, error: authError } = auth;
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const accountNumber = String(body.accountNumber ?? '').trim();
    const bankCode = String(body.bankCode ?? '').trim();
    const currencyInput = String(body.currency ?? '').trim().toUpperCase();
    const countryInput = String(body.country ?? '').trim().toUpperCase();
    const currency = currencyInput || inferCurrencyFromAfricanCountry(countryInput) || 'NGN';

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'accountNumber and bankCode are required' },
        { status: 400, headers: corsHeaders },
      );
    }
    const result = await validateFincraBankAccount({
      accountNumber,
      bankCode,
      currency,
    });

    return NextResponse.json(
      {
        valid: result.valid,
        accountName: result.accountName,
      },
      { headers: corsHeaders },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bank verification failed';
    const status = (e as { status?: number })?.status;
    const isFincraResolveAccessIssue =
      status === 403 && /invalid api key passed/i.test(String(msg));

    if (isFincraResolveAccessIssue) {
      // Temporary graceful fallback while Fincra enables /core/accounts/resolve on live account.
      return NextResponse.json(
        {
          success: true,
          pending_verification: true,
          message:
            'Bank account details saved, but live name verification is temporarily unavailable. You can continue and we will verify server-side once access is restored.',
        },
        { status: 200, headers: corsHeaders },
      );
    }

    console.error('POST /api/payouts/verify-bank:', e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
