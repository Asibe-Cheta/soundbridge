import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type { Database } from '@/src/lib/types';

type PortfolioItemRow = Database['public']['Tables']['service_portfolio_items']['Row'];
type PortfolioItemInsert = Database['public']['Tables']['service_portfolio_items']['Insert'];

interface PortfolioItemPayload {
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  displayOrder?: number | null;
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
    return NextResponse.json({ error: 'You can only view your own portfolio items' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  const { data, error: queryError } = await supabaseClient
    .from('service_portfolio_items')
    .select('*')
    .eq('provider_id', userId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (queryError) {
    return NextResponse.json(
      { error: 'Failed to load portfolio items', details: queryError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ items: data ?? [] }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only add portfolio items to your own profile' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  let body: PortfolioItemPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body.mediaUrl || typeof body.mediaUrl !== 'string') {
    return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400, headers: corsHeaders });
  }

  const payload: PortfolioItemInsert = {
    provider_id: userId,
    media_url: body.mediaUrl,
    thumbnail_url: body.thumbnailUrl ?? null,
    caption: body.caption ?? null,
    display_order: body.displayOrder ?? 0,
  };

  const { data: insertData, error: insertError } = await supabaseClient
    .from('service_portfolio_items')
    .insert(payload)
    .select('*')
    .single();

  const data = (insertData ?? null) as PortfolioItemRow | null;

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create portfolio item', details: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ item: data }, { status: 201, headers: corsHeaders });
}

