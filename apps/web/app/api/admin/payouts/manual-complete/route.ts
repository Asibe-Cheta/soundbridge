/**
 * Admin: Mark a payout request as completed without calling Wise (manual bank / Tide / etc.).
 * POST /api/admin/payouts/manual-complete
 * Body: { payout_request_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: corsHeaders }
      );
    }

    const supabase = admin.serviceClient;
    const body = await request.json().catch(() => ({}));
    const payoutRequestId = body?.payout_request_id;

    if (!payoutRequestId || typeof payoutRequestId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'payout_request_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: pr, error: prError } = await supabase
      .from('payout_requests')
      .select('id, creator_id, amount, currency, status')
      .eq('id', payoutRequestId)
      .single();

    if (prError || !pr) {
      return NextResponse.json(
        { success: false, error: 'Payout request not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (pr.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'This payout request is already completed.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const allowed = ['pending', 'failed', 'processing'];
    if (!allowed.includes(pr.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot mark as manually paid (status: ${pr.status}). Only pending, failed, or processing requests are allowed.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
        rejection_reason: null,
      })
      .eq('id', payoutRequestId);

    if (updateError) {
      console.error('manual-complete update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payout request' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Mirror Wise webhook: deduct creator balance for this payout amount.
    const { data: rpcOk, error: rpcErr } = await supabase.rpc('process_creator_payout', {
      user_uuid: pr.creator_id,
      payout_amount: Number(pr.amount),
    });

    const walletOk = !rpcErr && rpcOk !== false;
    if (!walletOk) {
      if (rpcErr) console.warn('process_creator_payout error:', rpcErr);
      if (rpcOk === false) console.warn('process_creator_payout returned false (insufficient balance or no bank?)');
      const { error: revErr } = await supabase.rpc('record_revenue_transaction', {
        user_uuid: pr.creator_id,
        transaction_type_param: 'payout',
        amount_param: -Number(pr.amount),
        customer_name_param: 'SoundBridge Platform (manual payout)',
        stripe_payment_intent_id_param: `manual_payout_${payoutRequestId}`,
      });
      if (revErr) {
        console.error('Wallet deduction fallback failed after manual complete — reconcile manually:', revErr);
        return NextResponse.json(
          {
            success: true,
            warning:
              'Marked completed in the database, but wallet deduction failed — reconcile manually or run wallet fix.',
            payout_request_id: payoutRequestId,
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    try {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', pr.creator_id)
        .maybeSingle();

      const email = creatorProfile?.email;
      if (email) {
        const currency = (pr.currency ?? 'USD').toString();
        const symbol =
          currency === 'NGN'
            ? '₦'
            : currency === 'GBP'
              ? '£'
              : currency === 'EUR'
                ? '€'
                : currency === 'GHS'
                  ? '₵'
                  : currency === 'KES'
                    ? 'KSh'
                    : '$';
        const amount = Number(pr.amount ?? 0);
        const displayName = creatorProfile?.display_name || 'Creator';
        const html = `
          <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
            <h2 style="margin: 0 0 10px;">Your SoundBridge payout has been recorded</h2>
            <p style="margin: 0 0 8px;">Hi <b>${displayName}</b>,</p>
            <p style="margin: 0 0 8px;">A payout of <b>${symbol}${amount.toFixed(2)}</b> has been marked as completed on your account.</p>
            <p style="margin: 0 0 8px; color: #555; font-size: 13px;">If you received this amount via an external transfer (e.g. bank), your balance has been updated accordingly.</p>
            <p style="margin-top: 16px; color: #666; font-size: 12px;">Support: contact@soundbridge.live</p>
          </div>
        `;
        await SendGridService.sendHtmlEmail(
          email,
          `SoundBridge: payout of ${symbol}${amount.toFixed(2)} recorded`,
          html
        );
      }
    } catch (emailErr) {
      console.error('Manual complete creator email failed:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payout marked as manually paid (completed).',
        payout_request_id: payoutRequestId,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Admin manual-complete error:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
