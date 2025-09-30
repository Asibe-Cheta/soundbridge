import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
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
      // Mobile app authentication
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      // Web app authentication
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's withdrawal methods
    const { data: methods, error: methodsError } = await supabase
      .from('wallet_withdrawal_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (methodsError) {
      console.error('Error fetching withdrawal methods:', methodsError);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawal methods' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        methods: methods || [],
        count: methods?.length || 0
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching withdrawal methods:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
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
      // Mobile app authentication
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      // Web app authentication
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { 
      method_type, 
      method_name, 
      country,
      currency,
      bank_details, 
      paypal_email, 
      crypto_address, 
      card_details 
    } = body;

    if (!method_type || !method_name) {
      return NextResponse.json(
        { error: 'Method type and name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Encrypt sensitive details based on method type
    let encryptedDetails = {};
    
    switch (method_type) {
      case 'bank_transfer':
        if (!bank_details) {
          return NextResponse.json(
            { error: 'Bank details are required for bank transfer' },
            { status: 400, headers: corsHeaders }
          );
        }
        encryptedDetails = {
          account_holder_name: bank_details.account_holder_name,
          bank_name: bank_details.bank_name,
          account_number: bank_details.account_number, // TODO: Encrypt this
          routing_number: bank_details.routing_number, // TODO: Encrypt this
          account_type: bank_details.account_type,
          currency: currency || bank_details.currency || 'USD' // Use currency from request body
        };
        break;
        
      case 'paypal':
        if (!paypal_email) {
          return NextResponse.json(
            { error: 'PayPal email is required' },
            { status: 400, headers: corsHeaders }
          );
        }
        encryptedDetails = {
          email: paypal_email
        };
        break;
        
      case 'crypto':
        if (!crypto_address) {
          return NextResponse.json(
            { error: 'Crypto address is required' },
            { status: 400, headers: corsHeaders }
          );
        }
        encryptedDetails = {
          address: crypto_address.address,
          currency: crypto_address.currency,
          network: crypto_address.network
        };
        break;
        
      case 'prepaid_card':
        if (!card_details) {
          return NextResponse.json(
            { error: 'Card details are required' },
            { status: 400, headers: corsHeaders }
          );
        }
        encryptedDetails = {
          card_number: card_details.card_number, // TODO: Encrypt this
          card_holder_name: card_details.card_holder_name,
          expiry_date: card_details.expiry_date,
          cvv: card_details.cvv // TODO: Encrypt this
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid method type' },
          { status: 400, headers: corsHeaders }
        );
    }

    // Create withdrawal method with country information
    const { data: method, error: methodError } = await supabase
      .from('wallet_withdrawal_methods')
      .insert({
        user_id: user.id,
        method_type: method_type,
        method_name: method_name,
        country: country,
        currency: currency,
        banking_system: method_type === 'bank_transfer' ? 'ACH' : null,
        encrypted_details: encryptedDetails,
        is_verified: false,
        is_default: false
      })
      .select()
      .single();

    if (methodError) {
      console.error('Error creating withdrawal method:', methodError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal method' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        method: method,
        message: 'Withdrawal method added successfully'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating withdrawal method:', error);
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
      }
    }
  );
}
