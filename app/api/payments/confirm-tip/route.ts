import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

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
        { status: 404 }
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
        { status: 500 }
      );
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
    });
    
  } catch (error) {
    console.error('Error in confirm-tip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
