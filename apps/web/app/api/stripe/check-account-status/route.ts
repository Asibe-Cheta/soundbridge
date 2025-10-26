import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '../../../../src/lib/stripe';

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

    // Get user's Stripe account ID from database
    const { data: bankAccount, error: bankAccountError } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id as any)
      .single() as { data: any; error: any };

    if (bankAccountError || !bankAccount?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found for user' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(bankAccount.stripe_account_id);
    
    console.log('🔍 Stripe account status check:', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements
    });

    // Update database with current status
    const verificationStatus = account.charges_enabled ? 'verified' : 'pending';
    const isVerified = account.charges_enabled;

    const { error: updateError } = await (supabase
      .from('creator_bank_accounts') as any)
      .update({
        verification_status: verificationStatus,
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating account status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update account status' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      accountStatus: {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        verificationStatus: verificationStatus,
        isVerified: isVerified,
        requirements: account.requirements
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error checking account status:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
