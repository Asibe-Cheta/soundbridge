import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking auth status...');
    
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔍 Auth check result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message 
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { 
          authenticated: false, 
          error: authError.message,
          details: 'Authentication check failed'
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'No user found',
          details: 'User session not found'
        },
        { status: 401 }
      );
    }

    // Try to get the user's profile to test database access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', user.id)
      .single();

    console.log('🔍 Profile check result:', { 
      hasProfile: !!profile, 
      profileError: profileError?.message 
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile || null
      },
      profileError: profileError?.message || null
    });

  } catch (error) {
    console.error('❌ Unexpected error checking auth status:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: `Internal server error: ${error}`,
        details: 'Unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
