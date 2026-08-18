import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST = viewer joined, DELETE = viewer left. Adjusts live_streams.viewer_count
 * via an atomic RPC; clients subscribe to that row's UPDATEs via Supabase
 * Realtime (postgres_changes) for the live-updating count. Call DELETE from
 * the viewer screen's unmount/cleanup — if a client is killed without
 * cleanup the count can drift high; acceptable for a viewer-count display,
 * not used for anything financial.
 */
async function adjust(request: NextRequest, params: { id: string }, delta: number) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc('adjust_live_stream_viewer_count', {
    p_live_stream_id: params.id,
    p_delta: delta,
  });

  if (error) {
    console.error('[live-streams/viewer] adjust failed:', error.message);
    return NextResponse.json({ error: 'Failed to update viewer count' }, { status: 500, headers: corsHeaders });
  }
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adjust(request, await params, 1);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adjust(request, await params, -1);
}
