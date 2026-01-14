import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication (mobile and web)
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
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
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {}
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options, maxAge: 0 });
              } catch (error) {}
            },
          },
        }
      );
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

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const { return_url, refresh_url } = await request.json();

    if (!return_url || !refresh_url) {
      return NextResponse.json(
        { error: 'return_url and refresh_url are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already has Stripe Connect account
    const { data: existingAccount } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id, is_verified')
      .eq('user_id', user.id)
      .single();

    let accountId: string;

    if (existingAccount?.stripe_account_id) {
      // Use existing account
      accountId = existingAccount.stripe_account_id;
      
      // Check if account is already verified
      if (existingAccount.is_verified) {
        return NextResponse.json(
          {
            account_id: accountId,
            onboarding_url: null,
            already_onboarded: true,
            message: 'Account already onboarded',
          },
          { headers: corsHeaders }
        );
      }
    } else {
      // Get user profile for country
      const { data: profile } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single();

      const country = profile?.country_code || 'GB';

      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save account ID to database
      const { error: saveError } = await supabase
        .from('creator_bank_accounts')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          verification_status: 'pending',
          is_verified: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (saveError) {
        console.error('Error saving Stripe account:', saveError);
      }
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url,
      return_url: return_url,
      type: 'account_onboarding',
    });

    return NextResponse.json(
      {
        account_id: accountId,
        onboarding_url: accountLink.url,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating Stripe onboarding:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
