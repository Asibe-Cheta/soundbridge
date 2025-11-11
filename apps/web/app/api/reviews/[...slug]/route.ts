import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const [providerId] = slug ?? [];

  if (!providerId) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400, headers: corsHeaders });
  }

  const auth = await getSupabaseRouteClient(request, false);
  const serviceSupabase = createServiceClient();

  const { data: providerProfile, error: providerError } = await serviceSupabase
    .from('service_provider_profiles')
    .select('status')
    .eq('user_id', providerId)
    .maybeSingle();

  if (providerError) {
    return NextResponse.json(
      { error: 'Failed to verify provider profile', details: providerError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!providerProfile) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404, headers: corsHeaders });
  }

  const isOwner = auth.user?.id === providerId;

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
    .eq('provider_id', providerId)
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

  return NextResponse.json({ reviews: reviews ?? [] }, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const [reviewId] = slug ?? [];

  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400, headers: corsHeaders });
  }

  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  let body: Partial<{
    rating: number;
    title: string | null;
    comment: string | null;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.rating !== undefined) {
    if (Number.isNaN(body.rating) || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.rating = Math.round(body.rating);
  }

  if (body.title !== undefined) {
    updatePayload.title = body.title;
  }

  if (body.comment !== undefined) {
    updatePayload.comment = body.comment;
  }

  const { data, error: updateError } = await supabase
    .from('service_reviews')
    .update(updatePayload)
    .eq('id', reviewId)
    .eq('reviewer_id', user.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update review', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ review: data }, { headers: corsHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const [reviewId] = slug ?? [];

  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400, headers: corsHeaders });
  }

  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const { error: deleteError } = await supabase
    .from('service_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('reviewer_id', user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete review', details: deleteError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

