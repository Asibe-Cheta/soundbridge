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

    // Get all restricted accounts for this user
    const { data: restrictedAccounts, error: accountsError } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id, verification_status')
      .eq('user_id', user.id as any)
      .eq('verification_status', 'pending' as any) as { data: any; error: any };

    if (accountsError) {
      console.error('Error fetching restricted accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!restrictedAccounts || restrictedAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No restricted accounts found',
        cleaned: 0
      }, { status: 200, headers: corsHeaders });
    }

    // Check Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Check each account with Stripe to see if it's actually restricted
    const accountsToCleanup = [];
    
    for (const account of restrictedAccounts) {
      try {
        const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
        
        // If account is restricted or charges are disabled, mark for cleanup
        if (!stripeAccount.charges_enabled || stripeAccount.requirements?.currently_due?.length > 0) {
          accountsToCleanup.push({
            id: account.stripe_account_id,
            status: stripeAccount.charges_enabled ? 'enabled' : 'restricted',
            requirements: stripeAccount.requirements?.currently_due || []
          });
        }
      } catch (error) {
        console.error(`Error checking account ${account.stripe_account_id}:`, error);
        // If we can't retrieve the account, it might be deleted or restricted
        accountsToCleanup.push({
          id: account.stripe_account_id,
          status: 'error',
          requirements: ['Account not accessible']
        });
      }
    }

    // Delete restricted accounts from database
    const { error: deleteError } = await (supabase
      .from('creator_bank_accounts') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('verification_status', 'pending');

    if (deleteError) {
      console.error('Error deleting restricted accounts:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clean up accounts' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Restricted accounts cleaned up',
      cleaned: accountsToCleanup.length,
      accounts: accountsToCleanup,
      recommendation: 'Contact Stripe support before creating new accounts'
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error cleaning up restricted accounts:', error);
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
