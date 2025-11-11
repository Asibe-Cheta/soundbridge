import { NextRequest, NextResponse } from 'next/server';

import { SERVICE_CATEGORIES, isValidServiceCategory } from '@/src/constants/creatorTypes';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/src/constants/currency';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

interface ServiceProviderPayload {
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  categories?: string[];
  defaultRate?: number | null;
  rateCurrency?: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const { data: creatorTypes, error: creatorTypesError } = await supabase
    .from('user_creator_types')
    .select('creator_type')
    .eq('user_id', user.id);

  if (creatorTypesError) {
    return NextResponse.json(
      { error: 'Failed to load creator types', details: creatorTypesError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!creatorTypes?.some((entry) => entry.creator_type === 'service_provider')) {
    return NextResponse.json(
      { error: 'You must add service_provider to your creator types before creating a provider profile.' },
      { status: 400, headers: corsHeaders },
    );
  }

  let body: ServiceProviderPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const {
    displayName,
    headline = null,
    bio = null,
    categories = [],
    defaultRate = null,
    rateCurrency = null,
  } = body;

  if (!displayName || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400, headers: corsHeaders });
  }

  const normalizedCategories = categories
    .map((category) => category?.toString().trim())
    .filter(Boolean) as string[];

  const invalidCategory = normalizedCategories.find((category) => !isValidServiceCategory(category));

  if (invalidCategory) {
    return NextResponse.json(
      { error: `Invalid service category: ${invalidCategory}`, validCategories: SERVICE_CATEGORIES },
      { status: 400, headers: corsHeaders },
    );
  }

  if (rateCurrency && !isSupportedCurrency(rateCurrency)) {
    return NextResponse.json(
      { error: `Unsupported currency ${rateCurrency}`, validCurrencies: SUPPORTED_CURRENCIES },
      { status: 400, headers: corsHeaders },
    );
  }

  const payload = {
    user_id: user.id,
    display_name: displayName.trim(),
    headline,
    bio,
    categories: normalizedCategories,
    default_rate: defaultRate,
    rate_currency: rateCurrency,
    updated_at: new Date().toISOString(),
  };

  const { data, error: upsertError } = await supabase
    .from('service_provider_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (upsertError) {
    return NextResponse.json(
      { error: 'Failed to save service provider profile', details: upsertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ provider: data }, { headers: corsHeaders });
}

