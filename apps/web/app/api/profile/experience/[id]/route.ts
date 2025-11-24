/**
 * PUT /api/profile/experience/[id] - Update an experience entry
 * DELETE /api/profile/experience/[id] - Delete an experience entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experienceId = params.id;
    console.log('✏️ Update Experience API called:', experienceId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify ownership
    const { data: existingExperience } = await supabase
      .from('profile_experience')
      .select('user_id')
      .eq('id', experienceId)
      .single();

    if (!existingExperience) {
      return NextResponse.json(
        { success: false, error: 'Experience not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existingExperience.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, company, description, start_date, end_date, is_current, location, collaborators } = body;

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (company !== undefined) updateData.company = company ? company.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = is_current ? null : end_date;
    if (is_current !== undefined) updateData.is_current = is_current;
    if (location !== undefined) updateData.location = location ? location.trim() : null;
    if (collaborators !== undefined) updateData.collaborators = Array.isArray(collaborators) ? collaborators : null;

    // Update experience
    const { data: updatedExperience, error: updateError } = await supabase
      .from('profile_experience')
      .update(updateData)
      .eq('id', experienceId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating experience:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update experience', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Experience updated successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          experience: updatedExperience,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error updating experience:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experienceId = params.id;
    console.log('🗑️ Delete Experience API called:', experienceId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Delete experience (verify ownership)
    const { error: deleteError } = await supabase
      .from('profile_experience')
      .delete()
      .eq('id', experienceId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting experience:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete experience', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Experience deleted successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Experience deleted successfully',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error deleting experience:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

