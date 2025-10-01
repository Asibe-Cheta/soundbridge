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
    console.log('🔧 Complete Onboarding API called');

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
    const { userId } = body;

    // Validate required fields
    if (!userId || userId !== user.id) {
      console.error('❌ Invalid user ID');
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Mark onboarding as completed
    const updateData = {
      onboarding_completed: true,
      onboarding_step: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Completing onboarding for user:', user.id);

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error completing onboarding:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to complete onboarding', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Onboarding completed successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      profile: updatedProfile
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error completing onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}