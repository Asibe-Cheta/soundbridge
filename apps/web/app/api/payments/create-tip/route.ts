import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

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
      const cookieStore = await cookies();
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
    
    // Parse request body
    const { creatorId, amount, currency, message, isAnonymous, userTier = 'free', paymentMethod = 'card' } = await request.json();
    
    // Validate required fields
    if (!creatorId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Creator ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Calculate platform fee based on tipper's tier (userTier)
    const platformFeeRate = userTier === 'free' ? 0.10 : userTier === 'pro' ? 0.08 : 0.05;
    const platformFee = Math.round(amount * platformFeeRate * 100) / 100;
    const creatorEarnings = Math.round((amount - platformFee) * 100) / 100;

    // Create real Stripe payment intent
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Configure payment methods based on selection
    const paymentIntentConfig: any = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'USD',
      metadata: {
        creatorId,
        tipperId: user.id,
        userTier,
        paymentMethod,
        platformFee: platformFee.toString(),
        creatorEarnings: creatorEarnings.toString(),
        tipMessage: message || '',
        isAnonymous: (isAnonymous || false).toString()
      },
      description: `Tip to creator ${creatorId}`,
    };

    // Configure payment methods based on selection
    if (paymentMethod === 'apple_pay') {
      paymentIntentConfig.payment_method_types = ['card', 'apple_pay'];
      // Don't set automatic_payment_methods when specifying payment_method_types
    } else if (paymentMethod === 'google_pay') {
      paymentIntentConfig.payment_method_types = ['card', 'google_pay'];
      // Don't set automatic_payment_methods when specifying payment_method_types
    } else {
      // Regular card payment - use automatic payment methods for better UX
      paymentIntentConfig.automatic_payment_methods = {
        enabled: true,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

    // Record the tip in the enhanced tip analytics system
    const { data: tipData, error: tipError } = await supabase
      .from('tip_analytics')
      .insert({
        creator_id: creatorId,
        tipper_id: user.id,
        tipper_tier: userTier,
        tip_amount: amount,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        fee_percentage: platformFeeRate * 100,
        tip_message: message,
        is_anonymous: isAnonymous || false,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending'
      })
      .select()
      .single();

    // Also record in the original creator_tips table for backward compatibility
    const { error: legacyTipError } = await supabase
      .from('creator_tips')
      .insert({
        creator_id: creatorId,
        tipper_id: user.id,
        amount: amount,
        currency: currency || 'USD',
        message: message,
        is_anonymous: isAnonymous || false,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending'
      });

    if (tipError) {
      console.error('Error creating tip record:', tipError);
      return NextResponse.json(
        { error: 'Failed to create tip record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      tipId: tipData.id,
      platformFee,
      creatorEarnings
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Error in create-tip:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
