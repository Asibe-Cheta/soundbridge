/**
 * Cron: auto-release escrow for delivered projects >48h with no dispute (run daily 00:00 UTC)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

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
      .select('id, poster_user_id, creator_user_id, status, stripe_payment_intent_id, creator_payout_amount, currency, title, updated_at')
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

      const { data: creatorAccount } = await service
        .from('creator_bank_accounts')
        .select('stripe_account_id')
        .eq('user_id', project.creator_user_id)
        .maybeSingle();

      let transferId: string | null = null;
      if (creatorAccount?.stripe_account_id) {
        const amountPence = Math.round(Number(project.creator_payout_amount) * 100);
        const transfer = await stripe.transfers.create({
          amount: amountPence,
          currency: (project.currency || 'gbp').toString().toLowerCase(),
          destination: creatorAccount.stripe_account_id,
          metadata: { project_id: project.id, opportunity_project: '1', auto_release: '1' },
        });
        transferId = transfer.id;
      }

      await service
        .from('opportunity_projects')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stripe_transfer_id: transferId,
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
          transaction_type: 'deposit',
          amount: releasedAmount,
          currency,
          description: `Opportunity payment (auto-released) — "${project.title}"`,
          reference_type: 'opportunity_project',
          reference_id: project.id,
          status: 'completed',
          metadata: { project_id: project.id, stripe_transfer_id: transferId },
        });
        await service.from('user_wallets').update({
          balance: Number(wallet.balance ?? 0) + releasedAmount,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id);
      }

      await service.from('notifications').insert([
        {
          user_id: project.creator_user_id,
          type: 'opportunity_project_completed',
          title: 'Payment auto-released',
          body: `Your payment of £${releasedAmount} for "${project.title}" has been released.`,
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
