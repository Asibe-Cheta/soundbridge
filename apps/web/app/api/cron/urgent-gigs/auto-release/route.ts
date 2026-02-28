/**
 * Cron: auto-release escrow for delivered projects >48h with no dispute (run daily 00:00 UTC)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.4
 * WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.MD — instant wallet credit only, no Stripe transfer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { sendGigPaymentPush } from '@/src/lib/gig-push-notifications';
import { sendGigPaymentEmails } from '@/src/lib/gig-payment-emails';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: projects } = await service
      .from('opportunity_projects')
      .select('id, opportunity_id, poster_user_id, creator_user_id, status, stripe_payment_intent_id, creator_payout_amount, currency, title, updated_at')
      .eq('status', 'delivered')
      .lt('updated_at', fortyEightHoursAgo);

    if (!projects?.length) {
      return NextResponse.json({ success: true, released: 0 });
    }

    const { data: openDisputes } = await service
      .from('disputes')
      .select('project_id')
      .in('status', ['open', 'under_review']);
    const disputedIds = new Set((openDisputes ?? []).map((d: { project_id: string }) => d.project_id));

    const toRelease = projects.filter((p) => !disputedIds.has(p.id));
    let released = 0;

    for (const project of toRelease) {
      if (!project.stripe_payment_intent_id || !stripe) continue;
      try {
        await stripe.paymentIntents.capture(project.stripe_payment_intent_id);
      } catch (e: unknown) {
        if ((e as { code?: string })?.code === 'payment_intent_unexpected_state') continue;
        console.error('auto-release capture:', project.id, e);
        continue;
      }

      await service
        .from('opportunity_projects')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      const releasedAmount = Number(project.creator_payout_amount);
      const currency = (project.currency || 'GBP').toString().toUpperCase().slice(0, 3);
      let { data: wallet } = await service.from('user_wallets').select('id, balance').eq('user_id', project.creator_user_id).eq('currency', currency).maybeSingle();
      if (!wallet?.id) {
        const { data: created } = await service.from('user_wallets').insert({ user_id: project.creator_user_id, currency }).select('id').single();
        if (created?.id) wallet = { id: created.id, balance: 0 };
      }
      if (wallet?.id) {
        await service.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          user_id: project.creator_user_id,
          transaction_type: 'gig_payment',
          amount: releasedAmount,
          currency,
          description: `Gig payment (auto-released) — "${project.title}"`,
          reference_type: 'opportunity_project',
          reference_id: project.id,
          status: 'completed',
          metadata: { project_id: project.id, auto_release: true },
        });
        await service.from('user_wallets').update({
          balance: Number(wallet.balance ?? 0) + releasedAmount,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id);
      }

      await sendGigPaymentPush(service, project.creator_user_id, {
        amount: releasedAmount,
        currency,
        gigTitle: project.title ?? 'Gig',
        gigId: (project as { opportunity_id?: string }).opportunity_id ?? project.id,
      });

      const PLATFORM_FEE_PCT = 0.12;
      const grossAmount = releasedAmount / (1 - PLATFORM_FEE_PCT);
      const platformFee = grossAmount * PLATFORM_FEE_PCT;
      let stripeReceiptUrl: string | null = null;
      if (project.stripe_payment_intent_id && stripe) {
        try {
          const pi = await stripe.paymentIntents.retrieve(project.stripe_payment_intent_id, { expand: ['charges.data'] });
          const charges = (pi as { charges?: { data?: Array<{ receipt_url?: string }> } }).charges?.data;
          stripeReceiptUrl = charges?.[0]?.receipt_url ?? null;
        } catch {
          /* ignore */
        }
      }
      sendGigPaymentEmails({
        service,
        creatorUserId: project.creator_user_id,
        requesterUserId: project.poster_user_id,
        gigTitle: project.title ?? 'Gig',
        grossAmount,
        platformFee,
        creatorEarnings: releasedAmount,
        newWalletBalance: Number(wallet?.balance ?? 0) + releasedAmount,
        currency,
        gigCompletedAt: new Date(),
        gigId: (project as { opportunity_id?: string }).opportunity_id ?? project.id,
        projectId: project.id,
        stripeReceiptUrl,
      }).catch(() => {});

      const amountDisplay = currency === 'GBP' ? `£${releasedAmount.toFixed(2)}` : currency === 'EUR' ? `€${releasedAmount.toFixed(2)}` : `${currency} ${releasedAmount.toFixed(2)}`;
      await service.from('notifications').insert([
        {
          user_id: project.creator_user_id,
          type: 'opportunity_project_completed',
          title: '💰 Payment received!',
          body: `${amountDisplay} from "${project.title}" is in your SoundBridge wallet.`,
          related_id: project.id,
          related_type: 'opportunity_project',
          metadata: { project_id: project.id },
        },
        {
          user_id: project.poster_user_id,
          type: 'opportunity_project_completed',
          title: 'Delivery auto-confirmed',
          body: `The project "${project.title}" was auto-confirmed after 48 hours.`,
          related_id: project.id,
          related_type: 'opportunity_project',
          metadata: { project_id: project.id },
        },
      ]);
      released++;
    }

    return NextResponse.json({ success: true, released });
  } catch (e) {
    console.error('cron urgent-gigs/auto-release:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
