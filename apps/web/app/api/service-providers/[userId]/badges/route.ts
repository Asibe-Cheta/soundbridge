import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type {
  ProviderBadgeTier,
  ServiceProviderProfileTable,
  ServiceProviderProfileUpdate,
} from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type BadgeRequirement = {
  minBookings: number;
  minRating: number | null;
  description: string;
};

const BADGE_CONFIG: Record<
  ProviderBadgeTier,
  {
    label: string;
    headline: string;
    requirements: BadgeRequirement;
  }
> = {
  new_provider: {
    label: 'New Provider',
    headline: 'Welcome aboard—your first booking unlocks momentum.',
    requirements: {
      minBookings: 0,
      minRating: null,
      description: 'Create your profile and publish at least one offering.',
    },
  },
  rising_star: {
    label: 'Rising Star',
    headline: 'Deliver great work to quickly build trust.',
    requirements: {
      minBookings: 3,
      minRating: 4.5,
      description: 'Complete 3 bookings with a 4.5+ rating.',
    },
  },
  established: {
    label: 'Established',
    headline: 'A consistent booking record puts you ahead in discovery.',
    requirements: {
      minBookings: 10,
      minRating: null,
      description: 'Complete 10 bookings with satisfied clients.',
    },
  },
  top_rated: {
    label: 'Top Rated',
    headline: 'Elite providers with stellar reviews surface first.',
    requirements: {
      minBookings: 25,
      minRating: 4.8,
      description: 'Complete 25 bookings with a 4.8+ rating.',
    },
  },
};

const BADGE_SEQUENCE: ProviderBadgeTier[] = ['new_provider', 'rising_star', 'established', 'top_rated'];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function isOwner(userId: string | null, providerId: string): Promise<boolean> {
  return !!userId && userId === providerId;
}

function calculatePercentage(current: number, required: number | null): number {
  if (!required || required <= 0) {
    return 1;
  }

  return Math.max(0, Math.min(1, current / required));
}

function buildBadgeStates(
  badgeTier: ProviderBadgeTier,
  completedBookings: number,
  averageRating: number,
): {
  states: Array<{
    tier: ProviderBadgeTier;
    label: string;
    headline: string;
    met: boolean;
    isCurrent: boolean;
    description: string;
    progress: {
      bookings: { current: number; required: number; percentage: number };
      rating?: { current: number; required: number; percentage: number };
    };
    requirements: BadgeRequirement;
  }>;
  nextBadge:
    | {
        tier: ProviderBadgeTier;
        label: string;
        description: string;
        remainingBookings: number;
        ratingShortfall: number;
        progress: {
          bookings: { current: number; required: number; percentage: number };
          rating?: { current: number; required: number; percentage: number };
        };
      }
    | null;
} {
  const states = BADGE_SEQUENCE.map((tier) => {
    const config = BADGE_CONFIG[tier];
    const bookingMet = completedBookings >= config.requirements.minBookings;
    const ratingRequirement = config.requirements.minRating;
    const ratingMet = ratingRequirement === null || averageRating >= ratingRequirement;
    const met = bookingMet && ratingMet;

    return {
      tier,
      label: config.label,
      headline: config.headline,
      met,
      isCurrent: tier === badgeTier,
      description: config.requirements.description,
      progress: {
        bookings: {
          current: completedBookings,
          required: config.requirements.minBookings,
          percentage: calculatePercentage(completedBookings, config.requirements.minBookings),
        },
        rating:
          ratingRequirement !== null
            ? {
                current: averageRating,
                required: ratingRequirement,
                percentage: calculatePercentage(averageRating, ratingRequirement),
              }
            : undefined,
      },
      requirements: config.requirements,
    };
  });

  const nextBadgeCandidate = states.find((state) => state.tier !== badgeTier && !state.met);
  const nextBadge = nextBadgeCandidate
    ? {
        tier: nextBadgeCandidate.tier,
        label: nextBadgeCandidate.label,
        description: nextBadgeCandidate.description,
        remainingBookings: Math.max(
          nextBadgeCandidate.requirements.minBookings - completedBookings,
          0,
        ),
        ratingShortfall:
          nextBadgeCandidate.requirements.minRating !== null
            ? Math.max(nextBadgeCandidate.requirements.minRating - averageRating, 0)
            : 0,
        progress: nextBadgeCandidate.progress,
      }
    : null;

  return { states, nextBadge };
}

async function fetchBadgeInsights(
  supabase: Awaited<ReturnType<typeof getSupabaseRouteClient>>['supabase'],
  providerId: string,
) {
  type ProviderProfileRow = ServiceProviderProfileTable;
  const supabaseClient = supabase as any;

  const { data: providerData, error: providerError } = await supabaseClient
    .from('service_provider_profiles')
    .select(
      `
        user_id,
        badge_tier,
        badge_updated_at,
        completed_booking_count,
        average_rating,
        review_count,
        is_verified,
        id_verified,
        show_payment_protection,
        first_booking_discount_enabled,
        first_booking_discount_percent
      `,
    )
    .eq('user_id', providerId)
    .maybeSingle();

  const provider = (providerData ?? null) as ProviderProfileRow | null;

  if (providerError) {
    console.error('Failed to fetch provider badge insights', {
      error: providerError.message,
      code: providerError.code,
      details: providerError.details,
      hint: providerError.hint,
    });
    throw new Error(`Failed to load badge data: ${providerError.message}${providerError.code ? ` (Code: ${providerError.code})` : ''}`);
  }

  if (!provider) {
    return null;
  }

  const { data: history, error: historyError } = await supabaseClient
    .from('provider_badge_history')
    .select('id, previous_tier, new_tier, created_at, reason')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (historyError) {
    console.error('Failed to load badge history', historyError);
  }

  const completedBookings = provider.completed_booking_count ?? 0;
  const averageRating = Number(provider.average_rating ?? 0);
  const { states, nextBadge } = buildBadgeStates(provider.badge_tier, completedBookings, averageRating);

  return {
    badgeTier: provider.badge_tier,
    badgeLabel: BADGE_CONFIG[provider.badge_tier].label,
    badgeHeadline: BADGE_CONFIG[provider.badge_tier].headline,
    badgeUpdatedAt: provider.badge_updated_at,
    completedBookings,
    averageRating,
    reviewCount: provider.review_count ?? 0,
    isVerified: provider.is_verified,
    idVerified: provider.id_verified,
    showPaymentProtection: provider.show_payment_protection,
    firstBookingDiscountEnabled: provider.first_booking_discount_enabled,
    firstBookingDiscountPercent: Number(provider.first_booking_discount_percent ?? 0),
    firstBookingDiscountEligible: completedBookings === 0,
    badges: states,
    nextBadge,
    history: (history ?? []).map((entry) => ({
      id: entry.id,
      previousTier: entry.previous_tier,
      newTier: entry.new_tier,
      reason: entry.reason,
      createdAt: entry.created_at,
    })),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await getSupabaseRouteClient(request, true);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (!(await isOwner(auth.user.id, userId))) {
    return NextResponse.json({ error: 'You can only view your own badge insights' }, { status: 403, headers: corsHeaders });
  }

  try {
    const insights = await fetchBadgeInsights(auth.supabase, userId);

    if (!insights) {
      return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ insights }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching badge insights', {
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: 'Failed to load badge insights',
        details: error?.message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await getSupabaseRouteClient(request, true);

  if (auth.error || !auth.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (!(await isOwner(auth.user.id, userId))) {
    return NextResponse.json({ error: 'You can only update your own trust settings' }, { status: 403, headers: corsHeaders });
  }

  let body: Partial<{
    showPaymentProtection: boolean;
    firstBookingDiscountEnabled: boolean;
    firstBookingDiscountPercent: number;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  type ProviderTrustProfile = Pick<
    ServiceProviderProfileTable,
    'completed_booking_count' | 'first_booking_discount_enabled' | 'first_booking_discount_percent' | 'show_payment_protection'
  >;

  const supabaseClient = auth.supabase as any;

  const { data: providerData, error: providerError } = await supabaseClient
    .from('service_provider_profiles')
    .select('completed_booking_count, first_booking_discount_enabled, first_booking_discount_percent, show_payment_protection')
    .eq('user_id', userId)
    .maybeSingle();

  const provider = (providerData ?? null) as ProviderTrustProfile | null;

  if (providerError) {
    console.error('Failed to load provider trust settings', providerError);
    return NextResponse.json({ error: 'Failed to load provider data' }, { status: 500, headers: corsHeaders });
  }

  if (!provider) {
    return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
  }

  type ProviderProfileUpdate = ServiceProviderProfileUpdate;
  const updatePayload: ProviderProfileUpdate = {};

  if (body.showPaymentProtection !== undefined) {
    if (typeof body.showPaymentProtection !== 'boolean') {
      return NextResponse.json({ error: 'showPaymentProtection must be a boolean' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.show_payment_protection = body.showPaymentProtection;
  }

  if (body.firstBookingDiscountEnabled !== undefined) {
    if (typeof body.firstBookingDiscountEnabled !== 'boolean') {
      return NextResponse.json({ error: 'firstBookingDiscountEnabled must be a boolean' }, { status: 400, headers: corsHeaders });
    }

    if (body.firstBookingDiscountEnabled && (provider.completed_booking_count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'First booking discount can only be enabled before your first completed booking.' },
        { status: 400, headers: corsHeaders },
      );
    }

    updatePayload.first_booking_discount_enabled = body.firstBookingDiscountEnabled;
  }

  if (body.firstBookingDiscountPercent !== undefined) {
    const parsedPercent = Number(body.firstBookingDiscountPercent);
    if (Number.isNaN(parsedPercent)) {
      return NextResponse.json(
        { error: 'firstBookingDiscountPercent must be a numeric value' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (parsedPercent < 0 || parsedPercent > 50) {
      return NextResponse.json(
        { error: 'firstBookingDiscountPercent must be between 0 and 50' },
        { status: 400, headers: corsHeaders },
      );
    }

    updatePayload.first_booking_discount_percent = parsedPercent;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { error: updateError } = await supabaseClient
    .from('service_provider_profiles')
    .update(updatePayload)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Failed to update trust settings', updateError);
    return NextResponse.json({ error: 'Failed to update trust settings' }, { status: 500, headers: corsHeaders });
  }

  try {
    const insights = await fetchBadgeInsights(auth.supabase, userId);
    return NextResponse.json({ insights }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error reloading badge insights after update', error);
    return NextResponse.json({ error: 'Trust settings updated, but failed to reload insights.' }, { status: 200, headers: corsHeaders });
  }
}

