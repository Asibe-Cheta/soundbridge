import type { SupabaseClient } from '@supabase/supabase-js';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { estimateFincraPayoutAmount } from '@/src/lib/payouts/fincra-payout-amount';
import { isFincraCurrency } from '@/src/lib/fincra-currencies';
import { generatePayoutReceiptPdf } from '@/src/lib/payouts/payout-receipt-pdf';
import {
  PLATFORM_FEE_PERCENT,
  FINCRA_TRANSFER_FEE_NGN_LABEL,
  STRIPE_ESTIMATED_FEE_PERCENT,
} from '@/src/lib/platform-fees';

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'NGN': return '₦';
    case 'GHS': return '₵';
    case 'KES': return 'KSh';
    default: return '$';
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Sends the withdrawal receipt (HTML body + PDF attachment) once a Fincra payout is confirmed
 * completed. Scoped to the Fincra rail only — Stripe-rail (GBP/USD/EUR) creator payouts go
 * through Stripe's own automatic payouts, not payout_requests, so there's no equivalent
 * completion hook for them yet (see WEB_TEAM_PAYOUT_FLOW_FINCRA_QUESTIONS.MD).
 *
 * Never throws — a receipt failure should never surface as an error on the admin action or
 * webhook that triggered it. Local-currency amount is an estimate at send time (no live FX
 * rate is stored against the original transfer), so it may differ slightly from the exact
 * amount the creator's bank shows if rates moved between the real transfer and this email.
 *
 * Returns whether a receipt was actually sent — false means "not a Fincra-rail payout" (or a
 * lookup failed), so callers covering other rails know to fall back to their own notification.
 */
export async function sendPayoutReceiptEmail(
  supabase: SupabaseClient,
  payoutRequestId: string,
  fincraTransferId: string | null,
): Promise<boolean> {
  try {
    const { data: pr } = await supabase
      .from('payout_requests')
      .select('id, creator_id, amount, currency, completed_at, bank_account_id')
      .eq('id', payoutRequestId)
      .maybeSingle();
    if (!pr) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', pr.creator_id)
      .maybeSingle();
    const email = profile?.email;
    if (!email) return false;

    let bankQuery = supabase
      .from('creator_bank_accounts')
      .select('currency, bank_name, account_last4')
      .eq('user_id', pr.creator_id)
      .eq('is_verified', true);
    if (pr.bank_account_id) {
      bankQuery = bankQuery.eq('id', pr.bank_account_id);
    }
    const { data: bankRows } = await bankQuery.limit(1);
    const bank = bankRows?.[0] ?? null;

    const localCurrency = (bank?.currency || 'NGN').toUpperCase();
    if (!isFincraCurrency(localCurrency)) {
      // Not a Fincra-rail payout — this function only covers that rail today.
      return false;
    }

    const walletAmount = Number(pr.amount);
    const walletCurrency = String(pr.currency || 'USD').toUpperCase();
    const { fincraAmount: localAmount } = estimateFincraPayoutAmount(
      walletAmount,
      walletCurrency,
      localCurrency as 'NGN' | 'GHS' | 'KES',
    );

    const completedAt = pr.completed_at || new Date().toISOString();
    const displayName = profile?.display_name || 'Creator';

    const pdfBuffer = await generatePayoutReceiptPdf({
      payoutRequestId: pr.id,
      creatorName: displayName,
      walletAmount,
      walletCurrency,
      localAmount,
      localCurrency,
      bankName: bank?.bank_name ?? null,
      accountLast4: bank?.account_last4 ?? null,
      completedAt,
      fincraTransferId,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin: 0 0 10px;">Your SoundBridge withdrawal has been sent</h2>
        <p style="margin: 0 0 8px;">Hi ${displayName},</p>
        <p style="margin: 0 0 8px;">Your withdrawal of <b>${formatAmount(walletAmount, walletCurrency)}</b> has been sent to your bank account as <b>${formatAmount(localAmount, localCurrency)}</b>.</p>
        <p style="margin: 0 0 8px; color: #444; font-size: 13px;">Your full receipt, including a breakdown of where fees go, is attached as a PDF.</p>
        <p style="margin: 0 0 8px; color: #666; font-size: 12px;">SoundBridge platform fee: ${PLATFORM_FEE_PERCENT}% (already reflected in your wallet balance) · Fincra transfer fee: ${FINCRA_TRANSFER_FEE_NGN_LABEL}, covered by SoundBridge · Stripe processing: ~${STRIPE_ESTIMATED_FEE_PERCENT}% estimated, covered by SoundBridge</p>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">Support: contact@soundbridge.live</p>
      </div>
    `;

    const sent = await SendGridService.sendHtmlEmail(
      email,
      `Your SoundBridge withdrawal receipt — ${formatAmount(walletAmount, walletCurrency)}`,
      html,
      {
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `SoundBridge-Withdrawal-Receipt-${pr.id}.pdf`,
            type: 'application/pdf',
          },
        ],
      },
    );
    return sent;
  } catch (e) {
    console.error('[send-payout-receipt-email] failed:', e);
    return false;
  }
}
