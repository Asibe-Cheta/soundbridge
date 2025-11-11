import { NextRequest, NextResponse } from 'next/server';

import { SERVICE_CATEGORIES, isValidServiceCategory } from '@/src/constants/creatorTypes';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/src/constants/currency';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type IncludeKey = 'offerings' | 'portfolio' | 'availability' | 'reviews';
type ServiceProviderProfileRow = Database['public']['Tables']['service_provider_profiles']['Row'];
type ServiceProviderProfileUpdate = Database['public']['Tables']['service_provider_profiles']['Update'];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const serviceSupabase = createServiceClient();
  const auth = await getSupabaseRouteClient(request, false);

  const { data: providerData, error } = await serviceSupabase
    .from('service_provider_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const provider = (providerData ?? null) as ServiceProviderProfileRow | null;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch service provider profile', details: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!provider) {
    return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
  }

  const isOwner = auth.user?.id === userId;

  if (!isOwner && provider.status !== 'active') {
    return NextResponse.json({ error: 'Service provider profile is not available' }, { status: 403, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const includeParam = searchParams.get('include') || '';
  const includes = new Set(
    includeParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean) as IncludeKey[],
  );

  const response: Record<string, unknown> = {
    provider,
  };

  if (includes.has('offerings')) {
    let offeringsQuery = serviceSupabase
      .from('service_offerings')
      .select('*')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false });

    if (!isOwner) {
      offeringsQuery = offeringsQuery.eq('is_active', true);
    }

    const { data: offerings, error: offeringsError } = await offeringsQuery;

    if (offeringsError) {
      return NextResponse.json(
        { error: 'Failed to load service offerings', details: offeringsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    response.offerings = offerings ?? [];
  }

  if (includes.has('portfolio')) {
    const { data: portfolio, error: portfolioError } = await serviceSupabase
      .from('service_portfolio_items')
      .select('*')
      .eq('provider_id', userId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (portfolioError) {
      return NextResponse.json(
        { error: 'Failed to load portfolio items', details: portfolioError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    response.portfolio = portfolio ?? [];
  }

  if (includes.has('availability')) {
    let availabilityQuery = serviceSupabase
      .from('service_provider_availability')
      .select('*')
      .eq('provider_id', userId)
      .order('start_time', { ascending: true });

    if (!isOwner) {
      const nowIso = new Date().toISOString();
      availabilityQuery = availabilityQuery
        .eq('is_bookable', true)
        .gte('end_time', nowIso);
    }

    const { data: availability, error: availabilityError } = await availabilityQuery;

    if (availabilityError) {
      return NextResponse.json(
        { error: 'Failed to load availability', details: availabilityError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    response.availability = availability ?? [];
  }

  if (includes.has('reviews')) {
    let reviewsQuery = serviceSupabase
      .from('service_reviews')
      .select(
        `
        *,
        reviewer:profiles!service_reviews_reviewer_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        )
      `,
      )
      .eq('provider_id', userId)
      .order('created_at', { ascending: false });

    if (!isOwner) {
      reviewsQuery = reviewsQuery.eq('status', 'published');
    }

    const { data: reviews, error: reviewsError } = await reviewsQuery;

    if (reviewsError) {
      return NextResponse.json(
        { error: 'Failed to load reviews', details: reviewsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    response.reviews = reviews ?? [];
  }

  return NextResponse.json(response, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only update your own service provider profile' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  let body: Partial<{
    displayName: string;
    headline: string | null;
    bio: string | null;
    categories: string[];
    defaultRate: number | null;
    rateCurrency: string | null;
    status: 'draft' | 'pending_review' | 'active' | 'suspended';
    isVerified: boolean;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  const updatePayload: ServiceProviderProfileUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (body.displayName !== undefined) {
    if (!body.displayName || typeof body.displayName !== 'string') {
      return NextResponse.json({ error: 'displayName must be a non-empty string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.display_name = body.displayName.trim();
  }

  if (body.headline !== undefined) {
    updatePayload.headline = body.headline;
  }

  if (body.bio !== undefined) {
    updatePayload.bio = body.bio;
  }

  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories)) {
      return NextResponse.json({ error: 'categories must be an array' }, { status: 400, headers: corsHeaders });
    }

    const normalizedCategories = body.categories
      .map((category) => category?.toString().trim())
      .filter(Boolean) as string[];

    const invalidCategory = normalizedCategories.find((category) => !isValidServiceCategory(category));

    if (invalidCategory) {
      return NextResponse.json(
        { error: `Invalid service category: ${invalidCategory}`, validCategories: SERVICE_CATEGORIES },
        { status: 400, headers: corsHeaders },
      );
    }

    updatePayload.categories = normalizedCategories;
  }

  if (body.defaultRate !== undefined) {
    if (body.defaultRate !== null && typeof body.defaultRate !== 'number') {
      return NextResponse.json({ error: 'defaultRate must be a number or null' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.default_rate = body.defaultRate;
  }

  if (body.rateCurrency !== undefined) {
    if (body.rateCurrency && !isSupportedCurrency(body.rateCurrency)) {
      return NextResponse.json(
        { error: `Unsupported currency ${body.rateCurrency}`, validCurrencies: SUPPORTED_CURRENCIES },
        { status: 400, headers: corsHeaders },
      );
    }
    updatePayload.rate_currency = body.rateCurrency || null;
  }

  if (body.status !== undefined) {
    updatePayload.status = body.status;
  }

  if (body.isVerified !== undefined) {
    updatePayload.is_verified = body.isVerified;
  }

  const { data: updateData, error: updateError } = await supabaseClient
    .from('service_provider_profiles')
    .update(updatePayload)
    .eq('user_id', userId)
    .select('*')
    .single();

  const data = (updateData ?? null) as ServiceProviderProfileRow | null;

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update service provider profile', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ provider: data }, { headers: corsHeaders });
}

