import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { enrichServiceReviewRow } from '@/src/lib/service-provider-response';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** Dedicated reviews list with reviewer flat fields (mobile dashboard). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const serviceSupabase = createServiceClient();
  const auth = await getSupabaseRouteClient(request, false);

  const { data: providerRow, error: providerError } = await serviceSupabase
    .from('service_provider_profiles')
    .select('user_id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (providerError) {
    return NextResponse.json(
      { error: 'Failed to load service provider', details: providerError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!providerRow) {
    return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
  }

  const isOwner = auth.user?.id === userId;
  if (!isOwner && providerRow.status !== 'active') {
    return NextResponse.json({ error: 'Service provider profile is not available' }, { status: 403, headers: corsHeaders });
  }

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

  const enriched = (reviews ?? []).map((r) => enrichServiceReviewRow(r as Record<string, unknown>));
  return NextResponse.json({ reviews: enriched }, { headers: corsHeaders });
}
