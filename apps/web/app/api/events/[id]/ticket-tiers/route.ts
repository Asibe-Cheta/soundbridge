import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

type TierRow = {
  id: string;
  name: string;
  description: string | null;
  price_gbp: number | null;
  price_ngn: number | null;
  price_ghs: number | null;
  quantity_available: number | null;
  quantity_sold: number;
  discount_percent: number | null;
  discount_quantity_limit: number | null;
  discount_quantity_used: number;
  display_order: number;
};

/** Whether p_currency's price on this tier is still at the discounted rate, and what it resolves to. */
function resolveTierPrice(tier: TierRow, currency: 'GBP' | 'NGN' | 'GHS') {
  const standardPrice =
    currency === 'GBP' ? tier.price_gbp : currency === 'NGN' ? tier.price_ngn : tier.price_ghs;
  const discountActive =
    tier.discount_percent != null &&
    tier.discount_quantity_limit != null &&
    tier.discount_quantity_used < tier.discount_quantity_limit;
  const soldOut = tier.quantity_available != null && tier.quantity_sold >= tier.quantity_available;
  const effectivePrice =
    standardPrice != null && discountActive
      ? Math.round(standardPrice * (1 - tier.discount_percent! / 100) * 100) / 100
      : standardPrice;

  return {
    standardPrice,
    effectivePrice,
    discountActive,
    discountRemaining: discountActive ? tier.discount_quantity_limit! - tier.discount_quantity_used : 0,
    soldOut,
    remaining: tier.quantity_available != null ? Math.max(0, tier.quantity_available - tier.quantity_sold) : null,
  };
}

/**
 * GET /api/events/[id]/ticket-tiers
 * Public — lists an event's ticket tiers with computed effective (post-discount) pricing.
 * Empty array means this event has no tiers and uses events.price_gbp/price_ngn directly.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const service = createServiceClient();

  const { data: tiers, error } = await service
    .from('event_ticket_tiers')
    .select(
      'id, name, description, price_gbp, price_ngn, price_ghs, quantity_available, quantity_sold, discount_percent, discount_quantity_limit, discount_quantity_used, display_order',
    )
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load ticket tiers' }, { status: 500, headers: corsHeaders });
  }

  const enriched = (tiers ?? []).map((tier) => ({
    ...tier,
    gbp: resolveTierPrice(tier as TierRow, 'GBP'),
    ngn: resolveTierPrice(tier as TierRow, 'NGN'),
    ghs: resolveTierPrice(tier as TierRow, 'GHS'),
  }));

  return NextResponse.json({ tiers: enriched }, { headers: corsHeaders });
}

/**
 * POST /api/events/[id]/ticket-tiers
 * Creator-only — bulk-creates tiers for this event. Called once, right after event
 * creation succeeds (same fire-and-forget pattern as event_co_organizers), not merged
 * into POST /api/events itself.
 *
 * Body: { tiers: [{ name, description?, price_gbp?, price_ngn?, price_ghs?, quantity_available?,
 *                     discount_percent?, discount_quantity_limit? }, ...] }
 * At least one of price_gbp/price_ngn/price_ghs is required per tier. discount_percent and
 * discount_quantity_limit must both be present together or both absent.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const service = createServiceClient();
  const { data: event, error: eventError } = await service
    .from('events')
    .select('id, creator_id')
    .eq('id', eventId)
    .single();
  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
  }
  if (event.creator_id !== user.id) {
    return NextResponse.json({ error: 'Only the event organizer can manage ticket tiers' }, { status: 403, headers: corsHeaders });
  }

  const body = await request.json().catch(() => ({}));
  const inputTiers = Array.isArray(body.tiers) ? body.tiers : [];
  if (inputTiers.length === 0) {
    return NextResponse.json({ error: 'tiers must be a non-empty array' }, { status: 400, headers: corsHeaders });
  }

  const rows = [];
  for (let i = 0; i < inputTiers.length; i++) {
    const t = inputTiers[i];
    if (typeof t.name !== 'string' || !t.name.trim()) {
      return NextResponse.json({ error: `tiers[${i}].name is required` }, { status: 400, headers: corsHeaders });
    }
    const priceGbp = t.price_gbp != null ? Number(t.price_gbp) : null;
    const priceNgn = t.price_ngn != null ? Number(t.price_ngn) : null;
    const priceGhs = t.price_ghs != null ? Number(t.price_ghs) : null;
    if (priceGbp == null && priceNgn == null && priceGhs == null) {
      return NextResponse.json(
        { error: `tiers[${i}] must have price_gbp, price_ngn, or price_ghs` },
        { status: 400, headers: corsHeaders },
      );
    }
    const discountPercent = t.discount_percent != null ? Number(t.discount_percent) : null;
    const discountLimit = t.discount_quantity_limit != null ? Number(t.discount_quantity_limit) : null;
    if ((discountPercent == null) !== (discountLimit == null)) {
      return NextResponse.json(
        { error: `tiers[${i}] discount_percent and discount_quantity_limit must be set together` },
        { status: 400, headers: corsHeaders },
      );
    }
    if (discountPercent != null && (discountPercent <= 0 || discountPercent >= 100)) {
      return NextResponse.json(
        { error: `tiers[${i}].discount_percent must be between 0 and 100` },
        { status: 400, headers: corsHeaders },
      );
    }

    rows.push({
      event_id: eventId,
      name: t.name.trim(),
      description: typeof t.description === 'string' ? t.description.trim() || null : null,
      price_gbp: priceGbp,
      price_ngn: priceNgn,
      price_ghs: priceGhs,
      quantity_available: t.quantity_available != null ? Number(t.quantity_available) : null,
      discount_percent: discountPercent,
      discount_quantity_limit: discountLimit,
      display_order: i,
    });
  }

  const { data: created, error: insertError } = await service
    .from('event_ticket_tiers')
    .insert(rows)
    .select();

  if (insertError) {
    console.error('[ticket-tiers] insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to create ticket tiers' }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ tiers: created }, { headers: corsHeaders });
}
