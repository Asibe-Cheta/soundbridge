import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';

interface ReviewPayload {
  providerId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  bookingReference?: string | null;
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

  let body: ReviewPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const { providerId, rating, title = null, comment = null, bookingReference = null } = body;

  if (!providerId) {
    return NextResponse.json({ error: 'providerId is required' }, { status: 400, headers: corsHeaders });
  }

  if (providerId === user.id) {
    return NextResponse.json({ error: 'You cannot review your own profile' }, { status: 400, headers: corsHeaders });
  }

  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400, headers: corsHeaders });
  }

  const { data: providerProfile, error: providerError } = await supabase
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

  if (!providerProfile || providerProfile.status !== 'active') {
    return NextResponse.json(
      { error: 'Cannot review this provider until their profile is active' },
      { status: 400, headers: corsHeaders },
    );
  }

  const payload = {
    provider_id: providerId,
    reviewer_id: user.id,
    rating: Math.round(rating),
    title,
    comment,
    booking_reference: bookingReference,
    status: 'pending' as const,
    updated_at: new Date().toISOString(),
  };

  const { data, error: insertError } = await supabase
    .from('service_reviews')
    .insert(payload)
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
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create review', details: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ review: data }, { status: 201, headers: corsHeaders });
}

