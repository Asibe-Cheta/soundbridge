import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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
      paymentIntentConfig.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never'
      };
    } else if (paymentMethod === 'google_pay') {
      paymentIntentConfig.payment_method_types = ['card', 'google_pay'];
      paymentIntentConfig.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never'
      };
    } else {
      // Regular card payment
      paymentIntentConfig.payment_method_types = ['card'];
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
    });
    
  } catch (error) {
    console.error('Error in create-tip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
