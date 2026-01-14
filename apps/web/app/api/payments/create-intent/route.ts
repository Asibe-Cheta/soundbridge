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

    // Parse request body
    const { content_id, content_type, price, currency } = await request.json();

    if (!content_id || !content_type || price === undefined || !currency) {
      return NextResponse.json(
        { error: 'content_id, content_type, price, and currency are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['track', 'album', 'podcast'].includes(content_type)) {
      return NextResponse.json(
        { error: 'content_type must be track, album, or podcast' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch content from database and validate
    let content: any = null;
    let creatorId: string | null = null;
    let dbPrice: number = 0;
    let dbCurrency: string = 'USD';

    if (content_type === 'track') {
      const { data: track, error: trackError } = await supabase
        .from('audio_tracks')
        .select('id, title, creator_id, is_paid, price, currency')
        .eq('id', content_id)
        .single();

      if (trackError || !track) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      if (!track.is_paid) {
        return NextResponse.json(
          { error: 'This content is not available for purchase' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (track.creator_id === user.id) {
        return NextResponse.json(
          { error: 'You cannot purchase your own content' },
          { status: 400, headers: corsHeaders }
        );
      }

      content = track;
      creatorId = track.creator_id;
      dbPrice = Number(track.price);
      dbCurrency = track.currency || 'USD';
    } else {
      // TODO: Handle albums and podcasts when those tables are available
      return NextResponse.json(
        { error: 'Album and podcast purchases not yet implemented' },
        { status: 501, headers: corsHeaders }
      );
    }

    // CRITICAL: Validate price matches database (never trust frontend)
    if (Math.abs(price - dbPrice) > 0.01) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (currency !== dbCurrency) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already owns this content
    const { data: existingPurchase } = await supabase
      .from('content_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .eq('status', 'completed')
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Already purchased' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate price range
    if (dbPrice < 0.99 || dbPrice > 50.00) {
      return NextResponse.json(
        { error: 'Invalid price range' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate fees (90/10 split)
    const platformFee = Math.round(dbPrice * 0.10 * 100) / 100;
    const creatorEarnings = Math.round(dbPrice * 0.90 * 100) / 100;

    // Create Stripe Payment Intent
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(dbPrice * 100), // Convert to cents
      currency: dbCurrency.toLowerCase(),
      metadata: {
        content_id: content_id,
        content_type: content_type,
        buyer_id: user.id,
        creator_id: creatorId || '',
        platform_fee: platformFee.toFixed(2),
        creator_earnings: creatorEarnings.toFixed(2),
      },
      description: `Purchase: ${content.title || 'Content'}`,
    });

    return NextResponse.json(
      {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
