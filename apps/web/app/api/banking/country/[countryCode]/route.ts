import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { countryCode: string } }
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    const { countryCode } = params;

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get country-specific banking information
    const { data: countryInfo, error } = await supabase
      .rpc('get_country_banking_info', { country_code_param: countryCode.toUpperCase() });

    if (error) {
      console.error('Error fetching country banking info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch country banking information' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!countryInfo || countryInfo.length === 0) {
      return NextResponse.json(
        { error: 'Country not supported' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        country: countryInfo[0],
        success: true
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching country banking info:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { message: 'CORS preflight' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
      }
    }
  );
}
