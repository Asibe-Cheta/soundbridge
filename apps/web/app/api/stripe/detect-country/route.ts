/**
 * GET /api/stripe/detect-country
 * Auto-detect user's country (and default currency) for Stripe Connect onboarding.
 * Mobile calls this on Payment Methods screen; fallback is profile country.
 * @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md §5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const DEFAULT_COUNTRY = 'GB';
const DEFAULT_CURRENCY = 'GBP';

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NG: 'NGN', GH: 'GHS', KE: 'KES',
  ZA: 'ZAR', IN: 'INR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', PL: 'PLN', CH: 'CHF', SE: 'SEK',
  NO: 'NOK', DK: 'DKK', JP: 'JPY', SG: 'SGD', HK: 'HKD', MY: 'MYR', NZ: 'NZD',
};

function normalizeCountry(code: string | null | undefined): string {
  if (code == null || typeof code !== 'string') return DEFAULT_COUNTRY;
  const c = code.trim().toUpperCase().slice(0, 2);
  return c || DEFAULT_COUNTRY;
}

export async function GET(request: NextRequest) {
  try {
    let country = normalizeCountry(request.headers.get('cf-ipcountry') ?? undefined);

    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (!authError && user) {
      const { createServiceClient } = await import('@/src/lib/supabase');
      const service = createServiceClient();
      const { data: profile } = await service
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single();
      const profileCountry = (profile as { country_code?: string } | null)?.country_code;
      if (profileCountry) country = normalizeCountry(profileCountry);
    }

    const currency = COUNTRY_TO_CURRENCY[country] ?? 'USD';

    return NextResponse.json(
      { country, currency },
      { headers: CORS }
    );
  } catch (e) {
    console.error('[stripe/detect-country]', e);
    return NextResponse.json(
      { country: DEFAULT_COUNTRY, currency: DEFAULT_CURRENCY },
      { status: 200, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
