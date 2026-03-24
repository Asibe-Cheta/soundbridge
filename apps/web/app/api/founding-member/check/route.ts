import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST /api/founding-member/check
 * Body: { email?: string } — if omitted and user is logged in, uses session email
 * Returns: { found: boolean, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      const { user, error: authError } = await getSupabaseRouteClient(request, false);
      if (!authError && user?.email) {
        email = user.email.trim().toLowerCase();
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { found: false, message: 'Please provide a valid email address.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceSupabase = createServiceClient();
    const { data: fm } = await serviceSupabase
      .from('founding_members')
      .select('id, claim_count, first_claimed_at')
      .eq('email', email)
      .maybeSingle();

    const found = !!fm;

    // Track every claim check attempt for reporting.
    const forwardedFor = request.headers.get('x-forwarded-for');
    const candidateIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
    const userAgent = request.headers.get('user-agent');

    const eventPayload = {
      email,
      founding_member_id: fm?.id ?? null,
      found,
      source: 'founding_member_page',
      ip_address: candidateIp || null,
      user_agent: userAgent || null,
    };

    const { error: claimEventError } = await serviceSupabase
      .from('founding_member_claim_events')
      .insert(eventPayload);

    if (claimEventError) {
      console.error('Failed to write founding member claim event:', claimEventError);
    }

    if (found && fm?.id) {
      const nextClaimCount = typeof fm.claim_count === 'number' ? fm.claim_count + 1 : 1;
      const updatePayload = {
        claim_count: nextClaimCount,
        last_claimed_at: new Date().toISOString(),
        first_claimed_at: fm.first_claimed_at ?? new Date().toISOString(),
      };

      const { error: fmUpdateError } = await serviceSupabase
        .from('founding_members')
        .update(updatePayload)
        .eq('id', fm.id);

      if (fmUpdateError) {
        console.error('Failed to update founding member claim counters:', fmUpdateError);
      }
    }

    return NextResponse.json(
      {
        found,
        message: found
          ? "You're confirmed as a Founding Member. When we launch, sign up with this email to get 10% off and your badge."
          : "This email isn't in our Founding Member list. If you think this is a mistake, contact us at contact@soundbridge.live.",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Founding member check error:', error);
    return NextResponse.json(
      { found: false, message: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
