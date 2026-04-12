import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../../../../src/lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { SubscriptionEmailService } from '../../../../src/services/SubscriptionEmailService';
import { sendExpoPush } from '../../../../src/lib/push-notifications';
import {
  getNextInvoiceNumber,
  sendInvoiceReceipt,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionPlanChangeEmail,
} from '../../../../src/lib/subscription-invoice-email';
import {
  isContentSalePaymentIntent,
  recordContentSaleFromPaymentIntent,
} from '../../../../src/lib/content-purchase-payment-intent-webhook';
import {
  isTipPaymentIntent,
  finalizeTipFromSucceededPaymentIntent,
} from '../../../../src/lib/tip-payment-intent-webhook';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  // Check Stripe is configured
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET_MAIN || process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        console.log('🔄 Stripe account updated:', account.id, 'charges_enabled:', account.charges_enabled);
        
        // Update database with new account status
        const { error: updateError } = await (supabase
          .from('creator_bank_accounts') as any)
          .update({
            verification_status: account.charges_enabled ? 'verified' : 'pending',
            is_verified: account.charges_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        if (updateError) {
          console.error('Error updating account status:', updateError);
        } else {
          console.log('✅ Account status updated in database');
        }
        break;

      case 'account.application.deauthorized':
        const deauthAccount = event.data.object;
        console.log('🚫 Account deauthorized:', deauthAccount.id);
        
        // Mark account as deauthorized
        await (supabase
          .from('creator_bank_accounts') as any)
          .update({
            verification_status: 'deauthorized',
            is_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', deauthAccount.id);
        break;

      // Subscription events for tier restructure
      case 'checkout.session.completed':
        const session = event.data.object as any;
        if (session.mode === 'subscription' && (session.metadata?.user_id || session.metadata?.userId)) {
          await handleCheckoutCompleted(session, supabase);
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as any;
        await handleSubscriptionDeleted(deletedSubscription, supabase);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await handlePaymentSucceeded(invoice, supabase);
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as any;
        if (failedInvoice.subscription) {
          await handlePaymentFailed(failedInvoice, supabase);
        }
        break;

      case 'charge.refunded':
        const charge = event.data.object as any;
        await handleRefundProcessed(charge, supabase);
        break;

      case 'refund.created':
        const refund = event.data.object as any;
        await handleRefundCreated(refund, supabase);
        break;

      case 'payment_intent.succeeded': {
        const piSucceeded = event.data.object as Stripe.PaymentIntent;
        if (piSucceeded.metadata?.project_source === 'opportunity') {
          await handleOpportunityProjectPaymentSucceeded(piSucceeded, supabase);
        } else if (isTipPaymentIntent(piSucceeded)) {
          await finalizeTipFromSucceededPaymentIntent(piSucceeded, supabase);
        } else if (isContentSalePaymentIntent(piSucceeded)) {
          await recordContentSaleFromPaymentIntent(piSucceeded, supabase);
        }
        break;
      }

      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.project_source === 'opportunity') {
          await handleOpportunityProjectPaymentSucceeded(pi, supabase);
        } else if (isTipPaymentIntent(pi)) {
          await finalizeTipFromSucceededPaymentIntent(pi, supabase);
        } else if (isContentSalePaymentIntent(pi)) {
          await recordContentSaleFromPaymentIntent(pi, supabase);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const piFailed = event.data.object as Stripe.PaymentIntent;
        if (piFailed.metadata?.project_source === 'opportunity') {
          console.warn(
            '[webhook] payment_intent.payment_failed for opportunity project PaymentIntent:',
            piFailed.id,
            'status:',
            piFailed.status
          );
          // Status remains payment_pending; mobile can call retry-payment to get a new client secret.
          // We intentionally do not change project state here to avoid conflicting with client UX.
        }
        break;
      }

      case 'payment_intent.canceled': {
        const piCanceled = event.data.object as Stripe.PaymentIntent;
        if (piCanceled.metadata?.project_source === 'opportunity') {
          await handleOpportunityProjectPaymentCanceled(piCanceled, supabase);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleOpportunityProjectPaymentSucceeded(
  pi: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Manual capture: when customer completes the sheet, status is requires_capture. We must capture so funds are secured and payment_intent.succeeded can fire.
    if (pi.status === 'requires_capture' && stripe) {
      try {
        await stripe.paymentIntents.capture(pi.id);
      } catch (captureErr: any) {
        if (captureErr?.code === 'payment_intent_unexpected_state' && captureErr?.payment_intent?.status === 'succeeded') {
          // Already captured (e.g. by another webhook delivery)
        } else {
          console.error('[webhook] paymentIntents.capture failed:', captureErr?.message ?? captureErr);
          return;
        }
      }
    }

    const { data: project } = await supabase
      .from('opportunity_projects')
      .select('id, interest_id, creator_user_id, poster_user_id, agreed_amount, creator_payout_amount, title, chat_thread_id')
      .eq('stripe_payment_intent_id', pi.id)
      .single();

    if (!project) {
      console.error('[webhook] Opportunity project not found for PaymentIntent:', pi.id);
      return;
    }

    const { data: posterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', project.poster_user_id)
      .single();

    const posterName = posterProfile?.display_name ?? 'The poster';

    // Only flip from payment_pending → awaiting_acceptance (idempotent; payment-first architecture)
    const { data: updateData } = await supabase
      .from('opportunity_projects')
      .update({ status: 'awaiting_acceptance', updated_at: new Date().toISOString() })
      .eq('id', project.id)
      .eq('status', 'payment_pending')
      .select('id')
      .maybeSingle();

    if (!updateData) {
      console.log('[webhook] Project already moved from payment_pending, skipping duplicate processing:', project.id);
      return;
    }

    await supabase
      .from('opportunity_interests')
      .update({ status: 'accepted' })
      .eq('id', project.interest_id);

    const systemMessage = `[Project agreement] £${project.agreed_amount} is in escrow for "${project.title}". Review and accept the agreement to start.`;
    await supabase.from('messages').insert({
      sender_id: project.poster_user_id,
      recipient_id: project.creator_user_id,
      content: systemMessage,
      message_type: 'text',
    });

    const notifTitle = 'Agreement Offer Received';
    const notifBody = `${posterName} accepted your interest in "${project.title}" and has secured payment. Review and accept the project agreement.`;
    const dataPayload = { type: 'opportunity_agreement_received', screen: 'OpportunityProject', projectId: project.id };

    await supabase.from('notifications').insert({
      user_id: project.creator_user_id,
      type: 'opportunity_agreement_received',
      title: notifTitle,
      body: notifBody,
      related_id: project.id,
      related_type: 'opportunity_project',
      metadata: { project_id: project.id },
      data: dataPayload,
    });

    await sendExpoPush(supabase, project.creator_user_id, {
      title: notifTitle,
      body: notifBody,
      data: { type: 'opportunity_agreement_received', screen: 'OpportunityProject', projectId: project.id },
      channelId: 'opportunities',
      sound: 'default',
    }).catch((pushErr) => console.error('[webhook] opportunity agreement push error:', pushErr));
  } catch (e) {
    console.error('[webhook] handleOpportunityProjectPaymentSucceeded error:', e);
  }
}

/** When poster cancels the payment sheet (or PaymentIntent is canceled), reset project to payment_pending so they can retry. */
async function handleOpportunityProjectPaymentCanceled(
  pi: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const { data: project } = await supabase
      .from('opportunity_projects')
      .select('id, status')
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle();

    if (!project) {
      return;
    }

    await supabase
      .from('opportunity_projects')
      .update({
        status: 'payment_pending',
        stripe_payment_intent_id: null,
        stripe_client_secret: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    console.log('[webhook] Project reset to payment_pending after payment_intent.canceled:', project.id);
  } catch (e) {
    console.error('[webhook] handleOpportunityProjectPaymentCanceled error:', e);
  }
}

// Subscription event handlers - Updated to use upsert

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Support both user_id (new) and userId (old) for backward compatibility
    const userId = session.metadata?.user_id || session.metadata?.userId;
    const billingCycle = session.metadata?.billing_cycle || 'monthly';
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !subscriptionId) {
      console.error('[webhook] Missing user_id or subscription_id in session metadata');
      return;
    }

    // Get subscription details from Stripe
    if (!stripe) {
      console.error('[webhook] Stripe not configured');
      return;
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const now = new Date();
    const subscriptionStartDate = new Date(subscription.current_period_start * 1000);
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const guaranteeEndDate = new Date(subscriptionStartDate);
    guaranteeEndDate.setDate(guaranteeEndDate.getDate() + 7);

    console.log('[webhook] Updating subscription for user:', userId);

    // Use upsert (INSERT with ON CONFLICT) to avoid UPDATE RLS issues
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          tier: 'pro',
          status: 'active',
          billing_cycle: billingCycle,
          stripe_customer_id: customerId as string,
          stripe_subscription_id: subscriptionId,
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_renewal_date: subscriptionEndDate.toISOString(),
          subscription_ends_at: subscriptionEndDate.toISOString(),
          money_back_guarantee_end_date: guaranteeEndDate.toISOString(),
          money_back_guarantee_eligible: true,
          refund_count: 0,
          updated_at: now.toISOString(),
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('[webhook] Error updating subscription:', error);
    } else {
      console.log('[webhook] Successfully updated subscription for user:', userId);
      
      // Send subscription confirmation email
      const userInfo = await SubscriptionEmailService.getUserInfo(userId);
      if (userInfo && userInfo.email) {
        const amount = billingCycle === 'monthly' ? '£9.99' : '£99.00';
        
        await SubscriptionEmailService.sendSubscriptionConfirmation({
          userEmail: userInfo.email,
          userName: userInfo.name,
          billingCycle,
          amount,
          currency: 'GBP',
          subscriptionStartDate: subscriptionStartDate.toISOString(),
          nextBillingDate: subscriptionEndDate.toISOString(),
          invoiceUrl: session.invoice_url || undefined
        });
      }
    }

  } catch (error) {
    console.error('[webhook] Error in handleCheckoutCompleted:', error);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id, subscription_price_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found in database:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const status = subscription.status === 'active' ? 'active' : 
                   subscription.status === 'canceled' ? 'cancelled' : 
                   subscription.status === 'past_due' ? 'past_due' : 'expired';

    const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
    const previousPriceId = (existingSub as { subscription_price_id?: string }).subscription_price_id ?? null;
    const planChanged = priceId != null && previousPriceId != null && priceId !== previousPriceId;
    const planName = subscription.items?.data?.[0]?.price?.nickname ?? subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'Pro (Annual)' : 'Pro (Monthly)';

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription_renewal_date: subscriptionEndDate.toISOString(),
          subscription_ends_at: subscriptionEndDate.toISOString(),
          status,
          ...(priceId && { subscription_price_id: priceId }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );

    if (error) {
      console.error('[webhook] Error updating subscription:', error);
      return;
    }

    if (status === 'active') {
      const plan = (subscription as { metadata?: { plan?: string } }).metadata?.plan ?? 'pro';
      sendExpoPush(supabase, userId, {
        title: 'Subscription Updated',
        body: `Your ${plan} subscription is active`,
        data: { type: 'subscription', plan },
        channelId: 'tips',
      }).catch((e) => console.error('[webhook] Subscription push:', e));
    }

    if (planChanged) {
      const userInfo = await SubscriptionEmailService.getUserInfo(userId);
      if (userInfo?.email) {
        await sendSubscriptionPlanChangeEmail(userInfo.email, {
          customerName: userInfo.name || 'there',
          planName,
          billingUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/billing`,
        });
      }
    }
  } catch (error) {
    console.error('[webhook] Error in handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;

    // Find user by subscription ID
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found for deletion:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;
    const currentTier = existingSub.tier || 'free';

    // Grant grace period if downgrading from paid tier to free
    if (currentTier !== 'free') {
      const { grantGracePeriod } = await import('@/src/lib/grace-period-service');
      const normalizedTier = currentTier === 'pro' ? 'premium' : currentTier === 'enterprise' ? 'unlimited' : currentTier;
      if (normalizedTier === 'premium' || normalizedTier === 'unlimited') {
        const graceResult = await grantGracePeriod(userId, normalizedTier as 'premium' | 'unlimited', 'free');
        if (graceResult.success) {
          console.log(`✅ Grace period granted to user ${userId} until ${graceResult.gracePeriodEnds}`);
        } else {
          console.log(`⚠️ Grace period not granted to user ${userId}: ${graceResult.error}`);
        }
      }
    }

    // Downgrade to free tier
    await supabase
      .from('user_subscriptions')
      .update({
        tier: 'free',
        status: 'cancelled',
        subscription_ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    // Also update profiles table
    await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'expired',
      })
      .eq('id', userId);

    console.log(`✅ Subscription cancelled and downgraded to free: ${subscriptionId}`);

    const userInfo = await SubscriptionEmailService.getUserInfo(userId);
    if (userInfo?.email) {
      const accessEndDate = new Date((subscription as { current_period_end?: number }).current_period_end * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      await sendSubscriptionCancelledEmail(userInfo.email, {
        customerName: userInfo.name || 'there',
        accessEndDate,
        resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/upgrade`,
      });
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found in database:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;

    if (invoice.period_end) {
      const renewalDate = new Date(invoice.period_end * 1000);
      await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            subscription_renewal_date: renewalDate.toISOString(),
            subscription_ends_at: renewalDate.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );
    }

    // UK-compliant invoice email (WEB_TEAM_SUBSCRIPTION_BILLING_INVOICES.MD) — idempotent by stripe_invoice_id
    let invoiceNumber: string;
    const { data: existingInv } = await supabase
      .from('subscription_invoices')
      .select('invoice_number')
      .eq('stripe_invoice_id', invoice.id)
      .maybeSingle();

    if (existingInv?.invoice_number) {
      invoiceNumber = existingInv.invoice_number as string;
    } else {
      try {
        invoiceNumber = await getNextInvoiceNumber(supabase);
        const { error: insertErr } = await supabase.from('subscription_invoices').insert({
          stripe_invoice_id: invoice.id,
          invoice_number: invoiceNumber,
          user_id: userId,
        });
        if (insertErr) {
          if ((insertErr as { code?: string }).code === '23505') {
            const { data: row } = await supabase.from('subscription_invoices').select('invoice_number').eq('stripe_invoice_id', invoice.id).single();
            invoiceNumber = (row?.invoice_number as string) ?? invoiceNumber;
          } else {
            throw insertErr;
          }
        }
      } catch (e) {
        console.error('[webhook] getNextInvoiceNumber/storeSubscriptionInvoice:', e);
        return;
      }
    }

    const userInfo = await SubscriptionEmailService.getUserInfo(userId);
    if (!userInfo?.email) return;

    if (!stripe) return;
    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ['customer', 'default_payment_method'],
    });
    const customer = fullInvoice.customer as Stripe.Customer | null;
    const pm = fullInvoice.default_payment_method;
    const cardLast4 =
      typeof pm === 'object' && pm && 'card' in pm && (pm as Stripe.PaymentMethod).card?.last4
        ? (pm as Stripe.PaymentMethod).card!.last4
        : '';

    const addr = customer?.address;
    const billingAddressFormatted = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ')
      : '';

    const line = fullInvoice.lines?.data?.[0];
    const periodStart = line?.period?.start != null ? new Date((line.period.start as number) * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const periodEnd = line?.period?.end != null ? new Date((line.period.end as number) * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const interval = (line?.price as Stripe.Price)?.recurring?.interval;
    const billingCycle = interval === 'year' ? 'Annual' : 'Monthly';
    const unitPrice = line?.amount != null ? (line.amount / 100).toFixed(2) : '0.00';
    const subtotal = (fullInvoice.subtotal ?? 0) / 100;
    const totalDiscountAmounts = (fullInvoice as Stripe.Invoice).total_discount_amounts;
    const discountAmount = totalDiscountAmounts?.[0]?.amount;
    const discount = fullInvoice.discount && discountAmount != null
      ? `${(fullInvoice.discount as { coupon?: { name?: string } }).coupon?.name ?? 'Discount'} — £${(discountAmount / 100).toFixed(2)}`
      : null;
    const paidAt = fullInvoice.status_transitions?.paid_at != null ? new Date((fullInvoice.status_transitions.paid_at as number) * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('en-GB');

    await sendInvoiceReceipt(userInfo.email, {
      invoiceNumber,
      invoiceDate: new Date((fullInvoice.created as number) * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
      paymentCollectedDate: paidAt,
      customerName: (customer?.name ?? userInfo.name) || '—',
      customerEmail: (customer?.email ?? userInfo.email) || '',
      billingAddressFormatted,
      planName: (line?.description as string) || 'SoundBridge Live subscription',
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      billingCycle,
      unitPriceFormatted: `£${unitPrice}`,
      quantity: line?.quantity ?? 1,
      subtotalFormatted: `£${subtotal.toFixed(2)}`,
      discountFormatted: discount,
      totalChargedFormatted: `£${((fullInvoice.amount_paid ?? 0) / 100).toFixed(2)}`,
      paymentMethodLast4: cardLast4,
      transactionReference: typeof fullInvoice.payment_intent === 'string' ? fullInvoice.payment_intent : (fullInvoice.payment_intent as Stripe.PaymentIntent)?.id ?? fullInvoice.id,
    });
    console.log('[webhook] UK invoice email sent:', invoiceNumber, subscriptionId);
  } catch (error) {
    console.error('[webhook] Error in handlePaymentSucceeded:', error);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found for payment failed:', subscriptionId);
      return;
    }

    await supabase
      .from('user_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscriptionId);

    const userInfo = await SubscriptionEmailService.getUserInfo(existingSub.user_id);
    if (!userInfo?.email) return;

    const amountFormatted = `£${(invoice.amount_due / 100).toFixed(2)}`;
    const nextRetry = invoice.next_payment_attempt != null ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null;
    const reason = (invoice as { last_finalization_error?: { message?: string } }).last_finalization_error?.message;

    await sendPaymentFailedEmail(userInfo.email, {
      customerName: userInfo.name || 'there',
      amountFormatted,
      reason,
      nextRetryDate: nextRetry,
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/billing`,
      noMoreRetries: !nextRetry,
    });
    console.log('[webhook] Payment failed email sent:', subscriptionId);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleRefundProcessed(
  charge: Stripe.Charge,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Find refund record by payment intent
    const paymentIntentId = charge.payment_intent as string;

    if (paymentIntentId) {
      // Update refund record if exists (legacy)
      const { data: refunds } = await supabase
        .from('refunds')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .limit(1);

      if (refunds && refunds.length > 0) {
        await supabase
          .from('refunds')
          .update({
            stripe_refund_id: charge.refunds?.data[0]?.id || null,
            refund_date: new Date().toISOString()
          })
          .eq('id', refunds[0].id);

        console.log(`✅ Refund processed: ${charge.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

async function handleRefundCreated(
  refund: Stripe.Refund,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const paymentIntentId = refund.payment_intent as string;

    if (!paymentIntentId) {
      console.log('⚠️ No payment intent ID in refund');
      return;
    }

    console.log(`💳 Processing refund webhook: ${refund.id} for payment intent: ${paymentIntentId}`);

    // Update purchased_event_tickets if this is an event ticket refund
    const { data: ticket, error: ticketError } = await supabase
      .from('purchased_event_tickets')
      .select('id, status')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (ticket && !ticketError) {
      // Update ticket status to refunded
      const { error: updateError } = await supabase
        .from('purchased_event_tickets')
        .update({
          status: 'refunded',
          refund_id: refund.id,
          refunded_at: new Date(refund.created * 1000).toISOString(),
          refund_amount: refund.amount / 100,
          metadata: {
            refund_id: refund.id,
            refunded_at: new Date(refund.created * 1000).toISOString(),
            refund_amount: refund.amount / 100,
            refund_status: refund.status,
            refund_reason: refund.reason
          },
          updated_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntentId);

      if (updateError) {
        console.error('❌ Failed to update ticket refund status:', updateError);
      } else {
        console.log(`✅ Event ticket ${ticket.id} marked as refunded`);
      }
    } else {
      // Check legacy ticket_purchases table
      const { data: legacyTicket, error: legacyError } = await supabase
        .from('ticket_purchases')
        .select('id, status')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (legacyTicket && !legacyError) {
        await supabase
          .from('ticket_purchases')
          .update({
            status: 'refunded',
            refund_id: refund.id,
            refunded_at: new Date(refund.created * 1000).toISOString(),
            refund_amount: refund.amount / 100, // Convert from cents to decimal
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntentId);

        console.log(`✅ Legacy ticket purchase ${legacyTicket.id} marked as refunded`);
      } else {
        console.log(`ℹ️ No ticket found for payment intent ${paymentIntentId} - may be subscription refund`);
      }
    }
  } catch (error) {
    console.error('❌ Error handling refund created:', error);
  }
}