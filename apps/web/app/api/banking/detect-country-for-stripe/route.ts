/**
 * GET /api/banking/detect-country-for-stripe
 *
 * Returns whether the user's country is supported by Stripe Connect (show Connect setup)
 * or should use the local bank account flow (Fincra for NG/GH/KE, or generic bank details elsewhere).
 *
 * Query: ?country_code=NG (optional). If omitted, uses authenticated user's profile.country_code.
 * Unknown countries default to supported_by_stripe: false (local bank flow).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { FINCRA_LOCAL_BANK_COUNTRY_CODES } from '@/src/lib/gig-wallet-credit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/** Stripe Connect–supported countries (same as create-account validation). */
const STRIPE_CONNECT_COUNTRIES = new Set([
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI',
  'BE', 'AT', 'CH', 'IE', 'PT', 'LU', 'SI', 'SK', 'CZ', 'PL', 'HU', 'GR', 'CY',
  'MT', 'EE', 'LV', 'LT', 'JP', 'SG', 'HK', 'MY', 'TH', 'NZ',
]);

function normalizeCountryCode(code: string | null | undefined): string | null {
  if (code == null || typeof code !== 'string') return null;
  const c = code.trim().toUpperCase().slice(0, 2);
  return c || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCountry = normalizeCountryCode(searchParams.get('country_code') ?? undefined);

    let countryCode: string | null = queryCountry;

    if (!countryCode) {
      const { user, error: authError } = await getSupabaseRouteClient(request, true);
      if (!authError && user) {
        const { createServiceClient } = await import('@/src/lib/supabase');
        const service = createServiceClient();
        const { data: profile } = await service
          .from('profiles')
          .select('country_code')
          .eq('id', user.id)
          .single();
        countryCode = normalizeCountryCode((profile as { country_code?: string } | null)?.country_code);
      }
    }

    const usesFincraPayouts =
      !!countryCode &&
      (FINCRA_LOCAL_BANK_COUNTRY_CODES as readonly string[]).includes(countryCode);
    const isStripeCountry = countryCode ? STRIPE_CONNECT_COUNTRIES.has(countryCode) : false;

    if (isStripeCountry) {
      return NextResponse.json(
        {
          country_code: countryCode,
          supported_by_stripe: true,
          uses_fincra_for_payouts: false,
        },
        { headers: CORS }
      );
    }

    return NextResponse.json(
      {
        country_code: countryCode ?? null,
        supported_by_stripe: false,
        uses_fincra_for_payouts: usesFincraPayouts,
      },
      { headers: CORS }
    );
  } catch (e) {
    console.error('[detect-country-for-stripe]', e);
    return NextResponse.json(
      { country_code: null, supported_by_stripe: false, uses_fincra_for_payouts: false },
      { status: 200, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
