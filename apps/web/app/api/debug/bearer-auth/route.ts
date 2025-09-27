import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    console.log('🔧 BEARER AUTH DEBUG ENDPOINT - Request received');
    
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔧 Environment check:');
    console.log('- SUPABASE_URL exists:', !!supabaseUrl);
    console.log('- SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
    console.log('- SUPABASE_URL value:', supabaseUrl);
    console.log('- SUPABASE_ANON_KEY preview:', supabaseAnonKey?.substring(0, 20) + '...');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { 
          error: 'Missing environment variables',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔧 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'No Bearer token provided',
          received: authHeader ? 'Non-Bearer auth header' : 'No auth header'
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const token = authHeader.substring(7);
    console.log('🔧 Token details:');
    console.log('- Length:', token.length);
    console.log('- Preview:', token.substring(0, 30) + '...');
    
    // Test Supabase client creation
    console.log('🔧 Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test authentication
    console.log('🔧 Testing authentication...');
    const { data, error } = await supabase.auth.getUser(token);
    
    console.log('🔧 Auth result:');
    console.log('- Success:', !!data.user);
    console.log('- User ID:', data.user?.id);
    console.log('- User email:', data.user?.email);
    console.log('- Error:', error?.message);
    
    return NextResponse.json({
      success: true,
      environment: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlPreview: supabaseUrl?.substring(0, 30) + '...'
      },
      token: {
        received: true,
        length: token.length,
        preview: token.substring(0, 30) + '...'
      },
      authentication: {
        success: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email,
        error: error?.message || null
      }
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('🔧 Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        message: error.message,
        stack: error.stack
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
