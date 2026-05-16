/**
 * Admin: Mark a payout request as completed without calling Fincra (manual bank transfer, etc.).
 * POST /api/admin/payouts/manual-complete
 * Body: { payout_request_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { completePayoutRequestBalanceDeduction } from '@/src/lib/payouts/complete-payout-request-balance';
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
    if (isAdminAccessDenied(admin)) {
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

    const allowedStatuses = ['pending', 'failed', 'processing', 'completed'];
    if (!allowedStatuses.includes(pr.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot mark as manually paid (status: ${pr.status}). Allowed: ${allowedStatuses.join(', ')}.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const walletCurrency = String(pr.currency ?? 'USD').toUpperCase();
    const deduct = await completePayoutRequestBalanceDeduction(supabase, {
      creatorId: pr.creator_id,
      amount: Number(pr.amount),
      payoutRequestId: pr.id,
      currency: walletCurrency,
    });

    if (!deduct.success) {
      const msg =
        deduct.error === 'insufficient_wallet_balance'
          ? `Insufficient ${walletCurrency} wallet balance (${deduct.wallet_balance_available ?? 0} available, ${deduct.required ?? pr.amount} required).`
          : deduct.error || 'Could not deduct creator wallet balance';
      return NextResponse.json(
        { success: false, error: msg, deduction: deduct },
        { status: 422, headers: corsHeaders }
      );
    }

    if (pr.status !== 'completed') {
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
          {
            success: false,
            error: 'Wallet was deducted but payout request status could not be updated — contact engineering.',
            deduction: deduct,
          },
          { status: 500, headers: corsHeaders }
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
      if (email && pr.status !== 'completed') {
        const currency = walletCurrency;
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
            <p style="margin: 0 0 8px; color: #555; font-size: 13px;">Your wallet balance has been updated. If you received funds via an external transfer, no further action is needed.</p>
            <p style="margin-top: 16px; color: #666; font-size: 12px;">Support: contact@soundbridge.live</p>
          </div>
        `;
        await SendGridService.sendHtmlEmail(
          email,
          `SoundBridge: payout of ${symbol}${amount.toFixed(2)} recorded`,
          html,
        );
      }
    } catch (emailErr) {
      console.error('Manual complete creator email failed:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: deduct.already_deducted
          ? 'Payout already completed; wallet balance was already deducted (no duplicate debit).'
          : 'Payout marked as manually paid and creator wallet updated.',
        payout_request_id: payoutRequestId,
        deduction: deduct,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error('Admin manual-complete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
