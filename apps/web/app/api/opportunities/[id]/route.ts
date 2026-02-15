import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunities/:id — Single opportunity with poster profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const { data: row, error } = await supabase
      .from('opportunity_posts')
      .select(`
        *,
        posted_by:profiles!user_id(id, username, display_name, avatar_url, professional_headline)
      `)
      .eq('id', id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404, headers: CORS });
    }
    if (!row.is_active || (row.expires_at && new Date(row.expires_at) < new Date())) {
      return NextResponse.json({ error: 'Opportunity not found or expired' }, { status: 404, headers: CORS });
    }

    const { data: interest } = await supabase
      .from('opportunity_interests')
      .select('id, status')
      .eq('opportunity_id', id)
      .eq('interested_user_id', user.id)
      .maybeSingle();

    return NextResponse.json(
      { ...row, has_expressed_interest: !!interest, my_interest_status: interest?.status ?? null },
      { headers: CORS }
    );
  } catch (e) {
    console.error('GET /api/opportunities/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

/**
 * PATCH /api/opportunities/:id — Update or deactivate (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const { data: existing } = await supabase.from('opportunity_posts').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed to update this opportunity' }, { status: 403, headers: CORS });
    }

    const body = await request.json();
    const allowed = [
      'title', 'description', 'skills_needed', 'location', 'is_remote', 'date_from', 'date_to',
      'budget_min', 'budget_max', 'budget_currency', 'visibility', 'is_active',
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.title !== undefined && (body.title.length < 5 || body.title.length > 120)) {
      return NextResponse.json({ error: 'title must be between 5 and 120 characters' }, { status: 400, headers: CORS });
    }
    if (body.description !== undefined && (body.description.length < 20 || body.description.length > 1000)) {
      return NextResponse.json({ error: 'description must be between 20 and 1000 characters' }, { status: 400, headers: CORS });
    }

    const { data: row, error } = await supabase
      .from('opportunity_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Opportunity update error:', error);
      return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500, headers: CORS });
    }
    return NextResponse.json(row, { headers: CORS });
  } catch (e) {
    console.error('PATCH /api/opportunities/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

/**
 * DELETE /api/opportunities/:id — Delete (owner only). 409 if active/delivered project exists.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const { data: existing } = await supabase.from('opportunity_posts').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed to delete this opportunity' }, { status: 403, headers: CORS });
    }

    const { data: activeProject } = await supabase
      .from('opportunity_projects')
      .select('id')
      .eq('opportunity_id', id)
      .in('status', ['awaiting_acceptance', 'payment_pending', 'active', 'delivered'])
      .limit(1)
      .maybeSingle();

    if (activeProject) {
      return NextResponse.json(
        { error: 'Cannot delete opportunity with an active or in-progress project. Complete or cancel the project first.' },
        { status: 409, headers: CORS }
      );
    }

    const { error } = await supabase.from('opportunity_posts').delete().eq('id', id);
    if (error) {
      console.error('Opportunity delete error:', error);
      return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500, headers: CORS });
    }
    return new NextResponse(null, { status: 204, headers: CORS });
  } catch (e) {
    console.error('DELETE /api/opportunities/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
