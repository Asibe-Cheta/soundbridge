import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Complete Profile API called');

    // Multi-header authentication support for mobile app
    let supabase;
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    console.log('🚨 MOBILE APP HEADER DEBUG (Profile):');
    console.log('- authorization:', request.headers.get('authorization'));
    console.log('- Authorization:', request.headers.get('Authorization'));  
    console.log('- x-authorization:', request.headers.get('x-authorization'));
    console.log('- x-auth-token:', request.headers.get('x-auth-token'));
    console.log('- x-supabase-token:', request.headers.get('x-supabase-token'));
    console.log('- Final authHeader:', authHeader);
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Handle both "Bearer token" format and raw token format
      const token = authHeader.startsWith('Bearer ') ? 
                   authHeader.substring(7) : 
                   authHeader;
      
      // Create a fresh Supabase client with the provided token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Get user with the token
      const { data, error } = await supabase.auth.getUser(token);
      user = data.user;
      authError = error;
    } else {
      console.log('🚨 Using cookie-based auth (no Bearer token found)');
      // Use cookie-based auth (web app)
      supabase = createRouteHandlerClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    console.log('📝 Profile data received:', Object.keys(body));

    // Validate required fields
    const { role, display_name } = body;
    if (!role || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Role and display_name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prepare update data
    const updateData: any = {
      // Basic profile fields
      role: role,
      display_name: display_name,
      bio: body.bio || null,
      country: body.country || null,
      genres: body.genres || null,
      avatar_url: body.avatar_url || null,
      
      // Creator-specific fields
      collaboration_enabled: body.collaboration_enabled || false,
      min_notice_days: body.min_notice_days || 7,
      social_links: body.social_links || null,
      
      // Onboarding completion
      onboarding_completed: true,
      onboarding_step: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      profile_completed: true,
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Updating profile with data:', Object.keys(updateData));

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Profile updated successfully for user:', user.id);
    console.log('📊 Updated profile role:', updatedProfile.role);

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
      profile: updatedProfile
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error completing profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
