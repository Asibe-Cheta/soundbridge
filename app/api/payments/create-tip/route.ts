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
    const { creatorId, amount, currency, message, isAnonymous } = await request.json();
    
    // Validate required fields
    if (!creatorId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Creator ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Get creator's tier for fee calculation
    const { data: creatorTier } = await supabase
      .from('user_upload_stats')
      .select('current_tier')
      .eq('user_id', creatorId)
      .single();

    const tier = creatorTier?.current_tier || 'free';
    
    // Calculate platform fee and creator earnings
    const platformFeeRate = tier === 'free' ? 0.10 : tier === 'pro' ? 0.05 : 0.02;
    const platformFee = Math.round(amount * platformFeeRate * 100) / 100;
    const creatorEarnings = Math.round((amount - platformFee) * 100) / 100;

    // TODO: Create Stripe payment intent
    // For now, we'll simulate the payment intent creation
    const mockPaymentIntentId = `pi_mock_${Date.now()}`;

    // Record the tip in the database
    const { data: tipData, error: tipError } = await supabase
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
      })
      .select()
      .single();

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
