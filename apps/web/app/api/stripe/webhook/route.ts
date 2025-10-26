import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../../../../src/lib/stripe';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}