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

    const body = await request.json();
    const { tier, billingCycle = 'monthly' } = body;

    // Validate tier
    if (!['pro', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }

    // Calculate subscription end date
    const now = new Date();
    const subscriptionEndsAt = new Date(now);
    
    if (billingCycle === 'monthly') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    } else {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
    }

    // First, cancel any existing active subscription
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Create new subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier,
        status: 'active',
        billing_cycle: billingCycle,
        subscription_ends_at: subscriptionEndsAt.toISOString()
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Log premium feature usage
    await supabase
      .from('premium_feature_usage')
      .insert({
        user_id: user.id,
        feature_name: 'subscription_upgrade',
        usage_count: 1
      });

    // Calculate pricing
    const pricing = {
      pro: {
        monthly: 9.99,
        yearly: 99.99 // 17% discount
      },
      enterprise: {
        monthly: 49.99,
        yearly: 499.99 // 17% discount
      }
    };

    const price = pricing[tier as keyof typeof pricing][billingCycle as keyof typeof pricing['pro']];

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        pricing: {
          tier,
          billingCycle,
          price,
          currency: 'USD',
          nextBillingDate: subscriptionEndsAt.toISOString()
        },
        message: `Successfully upgraded to ${tier} ${billingCycle} plan!`
      }
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
