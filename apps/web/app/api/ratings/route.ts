import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServerClient } from '@/src/lib/supabase';

const VALID_CONTEXTS = new Set(['event', 'service', 'collaboration', 'general']);

async function hasEventPurchase(
  serviceClient: ReturnType<typeof createServerClient>,
  raterId: string,
  ratedUserId: string
) {
  const { data, error } = await serviceClient
    .from('ticket_purchases')
    .select('id, events!inner(creator_id)')
    .eq('user_id', raterId)
    .eq('status', 'completed')
    .eq('events.creator_id', ratedUserId)
    .limit(1);

  if (error) {
    console.error('Error checking event purchase eligibility:', error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function hasServiceBooking(
  serviceClient: ReturnType<typeof createServerClient>,
  raterId: string,
  ratedUserId: string
) {
  const { data, error } = await serviceClient
    .from('service_bookings')
    .select('id')
    .eq('booker_id', raterId)
    .eq('provider_id', ratedUserId)
    .in('status', ['completed', 'paid'])
    .limit(1);

  if (error) {
    console.error('Error checking service booking eligibility:', error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function hasPaidCollaboration(
  serviceClient: ReturnType<typeof createServerClient>,
  raterId: string,
  ratedUserId: string
) {
  const { data, error } = await serviceClient
    .from('revenue_transactions')
    .select('id')
    .eq('payer_id', raterId)
    .eq('user_id', ratedUserId)
    .eq('transaction_type', 'collaboration')
    .eq('payment_status', 'completed')
    .limit(1);

  if (error) {
    console.error('Error checking collaboration eligibility:', error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: any = null;
    try {
      const rawBody = await request.text();
      if (!rawBody) {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Invalid JSON body for ratings:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const ratedUserId = typeof body?.rated_user_id === 'string' ? body.rated_user_id : '';
    const ratingValue = Number(body?.rating);
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : null;
    const context = typeof body?.context === 'string' ? body.context : 'general';

    if (!ratedUserId) {
      return NextResponse.json({ error: 'rated_user_id is required' }, { status: 400 });
    }

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    if (!VALID_CONTEXTS.has(context)) {
      return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
    }

    if (ratedUserId === user.id) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 });
    }

    const serviceClient = createServerClient();

    const { data: ratedUser, error: ratedUserError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', ratedUserId)
      .maybeSingle();

    if (ratedUserError) {
      console.error('Error validating rated user:', ratedUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!ratedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let eligible = false;

    if (context === 'event') {
      eligible = await hasEventPurchase(serviceClient, user.id, ratedUserId);
    } else if (context === 'service') {
      eligible = await hasServiceBooking(serviceClient, user.id, ratedUserId);
    } else if (context === 'collaboration') {
      eligible = await hasPaidCollaboration(serviceClient, user.id, ratedUserId);
    } else {
      const [eventEligible, serviceEligible, collaborationEligible] = await Promise.all([
        hasEventPurchase(serviceClient, user.id, ratedUserId),
        hasServiceBooking(serviceClient, user.id, ratedUserId),
        hasPaidCollaboration(serviceClient, user.id, ratedUserId),
      ]);
      eligible = eventEligible || serviceEligible || collaborationEligible;
    }

    if (!eligible) {
      return NextResponse.json(
        { error: 'Not eligible to rate', code: 'NOT_ELIGIBLE' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await serviceClient
      .from('creator_ratings')
      .upsert(
        {
          rated_user_id: ratedUserId,
          rater_user_id: user.id,
          rating: ratingValue,
          comment: comment || null,
          context,
          updated_at: now,
        },
        { onConflict: 'rated_user_id,rater_user_id,context' }
      );

    if (upsertError) {
      console.error('Error saving rating:', upsertError);
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected ratings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
