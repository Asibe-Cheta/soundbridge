import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * PATCH /api/alerts/:id
 * Update an alert
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

    const serviceSupabase = createServiceClient();

    // Verify user owns the alert
    const { data: alert, error: fetchError } = await serviceSupabase
      .from('opportunity_alerts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (alert.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own alerts' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    if (body.enabled !== undefined) {
      updateData.enabled = body.enabled;
    }
    if (body.keywords !== undefined) {
      updateData.keywords = body.keywords;
    }
    if (body.categories !== undefined) {
      // Validate categories
      const validCategories = ['collaboration', 'event', 'job'];
      const invalidCategories = body.categories.filter((cat: string) => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid categories: ${invalidCategories.join(', ')}` },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.categories = body.categories;
    }
    if (body.location !== undefined) {
      updateData.location = body.location || null;
    }

    // Update alert
    const { data: updatedAlert, error: updateError } = await serviceSupabase
      .from('opportunity_alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating alert:', updateError);
      return NextResponse.json(
        { error: 'Failed to update alert', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ alert: updatedAlert }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/alerts/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/alerts/:id
 * Delete an alert
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

    const serviceSupabase = createServiceClient();

    // Verify user owns the alert
    const { data: alert, error: fetchError } = await serviceSupabase
      .from('opportunity_alerts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (alert.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own alerts' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Delete alert
    const { error: deleteError } = await serviceSupabase
      .from('opportunity_alerts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting alert:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete alert', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/alerts/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

