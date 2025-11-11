import { NextRequest, NextResponse } from 'next/server';

import { SERVICE_CATEGORIES, isValidServiceCategory } from '@/src/constants/creatorTypes';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/src/constants/currency';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

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

  let body: Partial<{
    title: string;
    category: string;
    description: string | null;
    rateAmount: number | null;
    rateCurrency: string | null;
    rateUnit: string;
    isActive: boolean;
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

  if (body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.title = body.title.trim();
  }

  if (body.category !== undefined) {
    if (!isValidServiceCategory(body.category)) {
      return NextResponse.json(
        { error: `Invalid service category: ${body.category}`, validCategories: SERVICE_CATEGORIES },
        { status: 400, headers: corsHeaders },
      );
    }
    updatePayload.category = body.category;
  }

  if (body.description !== undefined) {
    updatePayload.description = body.description;
  }

  if (body.rateAmount !== undefined) {
    if (body.rateAmount !== null && typeof body.rateAmount !== 'number') {
      return NextResponse.json({ error: 'rateAmount must be a number or null' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.rate_amount = body.rateAmount;
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

  if (body.rateUnit !== undefined) {
    updatePayload.rate_unit = body.rateUnit || 'hour';
  }

  if (body.isActive !== undefined) {
    updatePayload.is_active = body.isActive;
  }

  const { data, error: updateError } = await supabase
    .from('service_offerings')
    .update(updatePayload)
    .eq('provider_id', userId)
    .eq('id', offeringId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update service offering', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ offering: data }, { headers: corsHeaders });
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

  const { error: deleteError } = await supabase
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

