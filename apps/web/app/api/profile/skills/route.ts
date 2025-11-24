/**
 * GET /api/profile/skills - Get user's skills
 * POST /api/profile/skills - Add a skill
 * DELETE /api/profile/skills - Remove a skill
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

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Get Skills API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's skills
    const { data: skills, error: skillsError } = await supabase
      .from('profile_skills')
      .select('id, skill, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (skillsError) {
      console.error('❌ Error fetching skills:', skillsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch skills', details: skillsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          skills: skills || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching skills:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ Add Skill API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { skill } = body;

    // Validation
    if (!skill || skill.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Skill is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const skillName = skill.trim();

    // Check if skill already exists (UNIQUE constraint will handle this, but we can check first)
    const { data: existingSkill } = await supabase
      .from('profile_skills')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill', skillName)
      .maybeSingle();

    if (existingSkill) {
      return NextResponse.json(
        { success: false, error: 'Skill already exists' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Add skill
    const { data: newSkill, error: insertError } = await supabase
      .from('profile_skills')
      .insert({
        user_id: user.id,
        skill: skillName,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error adding skill:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add skill', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Skill added successfully:', newSkill.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          skill: newSkill,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error adding skill:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Remove Skill API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { skill } = body;

    // Validation
    if (!skill || skill.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Skill is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Remove skill
    const { error: deleteError } = await supabase
      .from('profile_skills')
      .delete()
      .eq('user_id', user.id)
      .eq('skill', skill.trim());

    if (deleteError) {
      console.error('❌ Error removing skill:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove skill', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Skill removed successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Skill removed successfully',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error removing skill:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

