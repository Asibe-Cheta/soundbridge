import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cancel active subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        subscription_ends_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .select()
      .single();

    if (subError) {
      console.error('Error cancelling subscription:', subError);
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        message: 'Subscription cancelled successfully. You still have access to premium features until the end of your billing period.'
      }
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
