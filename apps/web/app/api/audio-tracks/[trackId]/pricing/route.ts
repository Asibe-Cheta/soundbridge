import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication
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
        { success: false, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const trackId = params.trackId;
    const { is_paid, price, currency } = await request.json();

    // Verify user is the track creator
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('creator_id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { success: false, message: 'Track not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'You can only set pricing for your own tracks' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_end_date')
      .eq('id', user.id)
      .single();

    const hasActiveSubscription = profile?.subscription_tier && 
                                  ['premium', 'unlimited'].includes(profile.subscription_tier) &&
                                  (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date());

    if (is_paid && !hasActiveSubscription) {
      return NextResponse.json(
        { success: false, message: 'Only subscribed creators (Premium or Unlimited) can sell content' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Validate price if setting as paid
    if (is_paid) {
      if (!price || price < 0.99 || price > 50.00) {
        return NextResponse.json(
          { success: false, message: 'Price must be between 0.99 and 50.00' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!currency || !['USD', 'GBP', 'EUR'].includes(currency)) {
        return NextResponse.json(
          { success: false, message: 'Currency must be USD, GBP, or EUR' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Update track pricing
    const updateData: any = {
      is_paid: is_paid || false,
    };

    if (is_paid) {
      updateData.price = price;
      updateData.currency = currency;
    } else {
      // Clear pricing when disabling paid
      updateData.price = null;
      updateData.currency = null;
    }

    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update(updateData)
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating track pricing:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update pricing' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Track pricing updated successfully',
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error updating track pricing:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
