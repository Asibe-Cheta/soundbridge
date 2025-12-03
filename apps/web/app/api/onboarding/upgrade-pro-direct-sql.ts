// Alternative approach: Direct SQL execution instead of RPC functions
// This bypasses PostgREST/RPC entirely and uses direct PostgreSQL queries

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe, getPriceId } from '@/src/lib/stripe';

// This is a reference implementation showing how to use direct SQL
// instead of RPC functions. We'll integrate this into the main route if needed.

export async function createSubscriptionDirectSQL(
  supabase: any,
  userId: string,
  subscriptionData: {
    billingCycle: string;
    customerId: string;
    subscriptionId: string;
    startDate: string;
    renewalDate: string;
    endsAt: string;
    guaranteeEndDate: string;
  }
) {
  // Check if subscription exists
  const { data: existing } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // UPDATE using direct SQL via Supabase
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        tier: 'pro',
        status: 'active',
        billing_cycle: subscriptionData.billingCycle,
        stripe_customer_id: subscriptionData.customerId,
        stripe_subscription_id: subscriptionData.subscriptionId,
        subscription_start_date: subscriptionData.startDate,
        subscription_renewal_date: subscriptionData.renewalDate,
        subscription_ends_at: subscriptionData.endsAt,
        money_back_guarantee_end_date: subscriptionData.guaranteeEndDate,
        money_back_guarantee_eligible: true,
        refund_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } else {
    // INSERT using direct SQL via Supabase
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier: 'pro',
        status: 'active',
        billing_cycle: subscriptionData.billingCycle,
        stripe_customer_id: subscriptionData.customerId,
        stripe_subscription_id: subscriptionData.subscriptionId,
        subscription_start_date: subscriptionData.startDate,
        subscription_renewal_date: subscriptionData.renewalDate,
        subscription_ends_at: subscriptionData.endsAt,
        money_back_guarantee_end_date: subscriptionData.guaranteeEndDate,
        money_back_guarantee_eligible: true,
        refund_count: 0
      })
      .select()
      .single();

    return { data, error };
  }
}
