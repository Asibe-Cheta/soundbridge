import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunities/:id
 * Get a single opportunity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceSupabase = createServiceClient();

    const { data: opportunity, error } = await serviceSupabase
      .from('opportunities')
      .select(`
        *,
        posted_by:profiles!poster_user_id(
          id,
          username,
          display_name,
          avatar_url,
          headline
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ opportunity }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in GET /api/opportunities/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/opportunities/:id
 * Update opportunity (poster only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user is the poster
    const serviceSupabase = createServiceClient();
    const { data: opportunity, error: fetchError } = await serviceSupabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (opportunity.poster_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the poster can update this opportunity' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    const allowedFields = [
      'title',
      'description',
      'status',
      'category',
      'location',
      'budget_min',
      'budget_max',
      'budget_currency',
      'deadline',
      'start_date',
      'keywords',
      'required_skills',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate status if provided
    if (updateData.status && !['active', 'filled', 'expired', 'cancelled'].includes(updateData.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update opportunity
    const { data: updatedOpportunity, error: updateError } = await serviceSupabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        posted_by:profiles!poster_user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating opportunity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update opportunity', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ opportunity: updatedOpportunity }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/opportunities/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/opportunities/:id
 * Soft delete opportunity (poster only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user is the poster
    const serviceSupabase = createServiceClient();
    const { data: opportunity, error: fetchError } = await serviceSupabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (opportunity.poster_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the poster can delete this opportunity' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Soft delete
    const { error: deleteError } = await serviceSupabase
      .from('opportunities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting opportunity:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete opportunity', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/opportunities/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

