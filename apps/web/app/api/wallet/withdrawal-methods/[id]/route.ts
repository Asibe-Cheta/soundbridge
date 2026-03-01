import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

/**
 * PUT/DELETE /api/wallet/withdrawal-methods/:id
 * Available to all authenticated users (no creator role required).
 * @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Method ID required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.method_name === 'string' && body.method_name.trim()) {
      updates.method_name = body.method_name.trim();
    }
    if (typeof body.is_default === 'boolean') {
      updates.is_default = body.is_default;
    }

    const { data, error } = await supabase
      .from('wallet_withdrawal_methods')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Withdrawal method not found' },
          { status: 404, headers: CORS_HEADERS }
        );
      }
      console.error('Error updating withdrawal method:', error);
      return NextResponse.json(
        { error: 'Failed to update withdrawal method' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, method: data },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Error in PUT withdrawal-methods/[id]:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Method ID required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { error } = await supabase
      .from('wallet_withdrawal_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting withdrawal method:', error);
      return NextResponse.json(
        { error: 'Failed to delete withdrawal method' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Withdrawal method deleted' },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('Error in DELETE withdrawal-methods/[id]:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
