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
    const { paymentIntentId } = await request.json();
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Update tip status to completed
    const { data: tipData, error: tipError } = await supabase
      .from('creator_tips')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (tipError || !tipData) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Update tip status
    const { error: updateError } = await supabase
      .from('creator_tips')
      .update({ status: 'completed' })
      .eq('id', tipData.id);

    if (updateError) {
      console.error('Error updating tip status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tip status' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 🚨 CRITICAL FIX: Add tip to creator's wallet
    try {
      // Calculate creator earnings (amount - platform fee)
      const platformFeeRate = tipData.userTier === 'free' ? 0.10 : tipData.userTier === 'pro' ? 0.08 : 0.05;
      const platformFee = Math.round(tipData.amount * platformFeeRate * 100) / 100;
      const creatorEarnings = Math.round((tipData.amount - platformFee) * 100) / 100;

      // Add tip to creator's wallet using the database function
      const { data: walletTransactionId, error: walletError } = await supabase
        .rpc('add_wallet_transaction', {
          user_uuid: tipData.creator_id,
          transaction_type: 'tip_received',
          amount: creatorEarnings,
          description: `Tip received${tipData.message ? `: ${tipData.message}` : ''}`,
          reference_id: paymentIntentId,
          metadata: {
            tipper_id: tipData.tipper_id,
            original_amount: tipData.amount,
            platform_fee: platformFee,
            tip_message: tipData.message,
            is_anonymous: tipData.is_anonymous
          }
        });

      if (walletError) {
        console.error('Error adding tip to wallet:', walletError);
        // Don't fail the request, just log the error
      } else {
        console.log('✅ Tip added to creator wallet:', walletTransactionId);
      }
    } catch (walletError) {
      console.error('Error processing wallet transaction:', walletError);
      // Don't fail the request, just log the error
    }

    // Record revenue transaction
    const { error: transactionError } = await supabase
      .rpc('record_revenue_transaction', {
        user_uuid: tipData.creator_id,
        transaction_type_param: 'tip',
        amount_param: tipData.amount,
        customer_email_param: user.email,
        customer_name_param: user.user_metadata?.display_name || user.email,
        stripe_payment_intent_id_param: paymentIntentId
      });

    if (transactionError) {
      console.error('Error recording revenue transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Tip sent successfully!'
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Error in confirm-tip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
