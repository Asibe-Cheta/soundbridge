import { NextRequest, NextResponse } from 'next/server';

import { SERVICE_CATEGORIES, isValidServiceCategory } from '@/src/constants/creatorTypes';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/src/constants/currency';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type { Database } from '@/src/lib/types';

interface CreateOfferingPayload {
  title: string;
  category: string;
  description?: string | null;
  rateAmount?: number | null;
  rateCurrency?: string | null;
  rateUnit?: string;
  isActive?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only view your own offerings' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  type ServiceOfferingRow = Database['public']['Tables']['service_offerings']['Row'];
  type ServiceOfferingInsert = Database['public']['Tables']['service_offerings']['Insert'];

  const { data, error: queryError } = await supabaseClient
    .from('service_offerings')
    .select('*')
    .eq('provider_id', userId)
    .order('created_at', { ascending: false });

  if (queryError) {
    return NextResponse.json(
      { error: 'Failed to load service offerings', details: queryError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ offerings: data ?? [] }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only create offerings for your own profile' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  let body: CreateOfferingPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const {
    title,
    category,
    description = null,
    rateAmount = null,
    rateCurrency = null,
    rateUnit = 'hour',
    isActive = true,
  } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400, headers: corsHeaders });
  }

  if (!category || !isValidServiceCategory(category)) {
    return NextResponse.json(
      { error: `Invalid service category: ${category}`, validCategories: SERVICE_CATEGORIES },
      { status: 400, headers: corsHeaders },
    );
  }

  if (rateCurrency && !isSupportedCurrency(rateCurrency)) {
    return NextResponse.json(
      { error: `Unsupported currency ${rateCurrency}`, validCurrencies: SUPPORTED_CURRENCIES },
      { status: 400, headers: corsHeaders },
    );
  }

  const payload: ServiceOfferingInsert = {
    provider_id: userId,
    title: title.trim(),
    category,
    description,
    rate_amount: rateAmount,
    rate_currency: rateCurrency,
    rate_unit: rateUnit || 'hour',
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const { data: insertData, error: insertError } = await supabaseClient
    .from('service_offerings')
    .insert(payload)
    .select('*')
    .single();

  const data = (insertData ?? null) as ServiceOfferingRow | null;

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create service offering', details: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ offering: data }, { status: 201, headers: corsHeaders });
}

