import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { creatorId, amount, currency, message, isAnonymous, userTier = 'free' } = await request.json();
    
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

    // TODO: Create Stripe payment intent
    // For now, we'll simulate the payment intent creation
    const mockPaymentIntentId = `pi_mock_${Date.now()}`;

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
        stripe_payment_intent_id: mockPaymentIntentId,
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
        stripe_payment_intent_id: mockPaymentIntentId,
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
      paymentIntentId: mockPaymentIntentId,
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
