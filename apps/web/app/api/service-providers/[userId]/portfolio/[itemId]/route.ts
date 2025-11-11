import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type { Database } from '@/src/lib/types';

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
  { params }: { params: Promise<{ userId: string; itemId: string }> },
) {
  const { userId, itemId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only update your own portfolio items' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  type PortfolioItemRow = Database['public']['Tables']['service_portfolio_items']['Row'];
  type PortfolioItemUpdate = Database['public']['Tables']['service_portfolio_items']['Update'];

  let body: Partial<{
    mediaUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    displayOrder: number | null;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  const updatePayload: PortfolioItemUpdate = {};

  if (body.mediaUrl !== undefined) {
    if (!body.mediaUrl || typeof body.mediaUrl !== 'string') {
      return NextResponse.json({ error: 'mediaUrl must be a non-empty string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.media_url = body.mediaUrl;
  }

  if (body.thumbnailUrl !== undefined) {
    updatePayload.thumbnail_url = body.thumbnailUrl;
  }

  if (body.caption !== undefined) {
    updatePayload.caption = body.caption;
  }

  if (body.displayOrder !== undefined) {
    updatePayload.display_order = body.displayOrder;
  }

  const { data: updateData, error: updateError } = await supabaseClient
    .from('service_portfolio_items')
    .update(updatePayload)
    .eq('provider_id', userId)
    .eq('id', itemId)
    .select('*')
    .single();

  const data = (updateData ?? null) as PortfolioItemRow | null;

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update portfolio item', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ item: data }, { headers: corsHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; itemId: string }> },
) {
  const { userId, itemId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only delete your own portfolio items' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  const { error: deleteError } = await supabaseClient
    .from('service_portfolio_items')
    .delete()
    .eq('provider_id', userId)
    .eq('id', itemId);

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete portfolio item', details: deleteError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

