import { NextRequest, NextResponse } from 'next/server';

import { SERVICE_CATEGORIES, isValidServiceCategory } from '@/src/constants/creatorTypes';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/src/constants/currency';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { enrichServiceOfferingRow } from '@/src/lib/service-provider-response';
import type { Database } from '@/src/lib/types';

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; offeringId: string }> },
) {
  const { userId, offeringId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only update your own offerings' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  type ServiceOfferingRow = Database['public']['Tables']['service_offerings']['Row'];
  type ServiceOfferingUpdate = Database['public']['Tables']['service_offerings']['Update'];

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  const updatePayload: ServiceOfferingUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    const t = typeof body.title === 'string' ? body.title : '';
    if (!t) {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.title = t.trim();
  }

  if (body.category !== undefined) {
    const c = typeof body.category === 'string' ? body.category : '';
    if (!isValidServiceCategory(c)) {
      return NextResponse.json(
        { error: `Invalid service category: ${c}`, validCategories: SERVICE_CATEGORIES },
        { status: 400, headers: corsHeaders },
      );
    }
    updatePayload.category = c;
  }

  if (body.description !== undefined) {
    updatePayload.description =
      body.description === null ? null : String(body.description);
  }

  if (body.rate_amount !== undefined || body.rateAmount !== undefined || body.rate !== undefined) {
    const raw = body.rate_amount ?? body.rateAmount ?? body.rate;
    if (raw !== null && raw !== undefined && typeof raw !== 'number' && typeof raw !== 'string') {
      return NextResponse.json({ error: 'rate_amount must be a number or null' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.rate_amount = coerceNumber(raw);
  }

  if (body.rate_currency !== undefined || body.rateCurrency !== undefined) {
    const rc = body.rate_currency ?? body.rateCurrency;
    const rcStr = rc === null || rc === undefined ? null : String(rc);
    if (rcStr && !isSupportedCurrency(rcStr)) {
      return NextResponse.json(
        { error: `Unsupported currency ${rcStr}`, validCurrencies: SUPPORTED_CURRENCIES },
        { status: 400, headers: corsHeaders },
      );
    }
    updatePayload.rate_currency = rcStr;
  }

  if (body.rate_unit !== undefined || body.rateUnit !== undefined || body.unit !== undefined) {
    updatePayload.rate_unit = String(body.rate_unit ?? body.rateUnit ?? body.unit ?? 'hour');
  }

  if (body.is_active !== undefined || body.isActive !== undefined) {
    updatePayload.is_active = Boolean(body.is_active ?? body.isActive);
  }

  const { data: updateData, error: updateError } = await supabaseClient
    .from('service_offerings')
    .update(updatePayload)
    .eq('provider_id', userId)
    .eq('id', offeringId)
    .select('*')
    .single();

  const data = (updateData ?? null) as ServiceOfferingRow | null;

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update service offering', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { offering: enrichServiceOfferingRow(data as unknown as Record<string, unknown>) },
    { headers: corsHeaders },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; offeringId: string }> },
) {
  const { userId, offeringId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only delete your own offerings' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  const { error: deleteError } = await supabaseClient
    .from('service_offerings')
    .delete()
    .eq('provider_id', userId)
    .eq('id', offeringId);

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete service offering', details: deleteError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

