/**
 * Gig payment email receipts — WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md
 * Sends creator earnings receipt + requester payment confirmation. Do not fail gig completion on email errors.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { SendGridService } from './sendgrid-service';

const WISE_COUNTRIES = ['NG', 'GH', 'KE', 'EG', 'ZA', 'UG', 'TZ'] as const;
const WITHDRAWAL_CTA_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://soundbridge.live';
const GIG_VIEW_BASE = WITHDRAWAL_CTA_URL + '/projects';

export interface SendGigPaymentEmailsParams {
  service: SupabaseClient;
  creatorUserId: string;
  requesterUserId: string;
  gigTitle: string;
  grossAmount: number;
  platformFee: number;
  creatorEarnings: number;
  newWalletBalance: number;
  currency: string;
  gigCompletedAt: Date;
  gigId: string;
  projectId: string;
  stripeReceiptUrl?: string | null;
}

/**
 * Fetch user email via auth.admin (service role). Returns null if not found or unconfirmed.
 */
async function getUserEmail(service: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await service.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    const u = data.user as { email_confirmed_at?: string | null };
    if (u.email_confirmed_at === undefined) return data.user.email ?? null;
    return u.email_confirmed_at ? (data.user.email ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Send creator earnings receipt and requester payment confirmation. Swallows errors so gig completion never fails.
 */
export async function sendGigPaymentEmails(params: SendGigPaymentEmailsParams): Promise<void> {
  const {
    service,
    creatorUserId,
    requesterUserId,
    gigTitle,
    grossAmount,
    platformFee,
    creatorEarnings,
    newWalletBalance,
    currency,
    gigCompletedAt,
    projectId,
    stripeReceiptUrl,
  } = params;

  try {
    const [creatorEmail, requesterEmail, profiles] = await Promise.all([
      getUserEmail(service, creatorUserId),
      getUserEmail(service, requesterUserId),
      service
        .from('profiles')
        .select('id, display_name, username, country_code')
        .in('id', [creatorUserId, requesterUserId]),
    ]);

    const profileMap = new Map(
      (profiles.data ?? []).map((p: { id: string; display_name?: string | null; username?: string | null; country_code?: string | null }) => [
        p.id,
        { display_name: p.display_name ?? p.username ?? 'User', country_code: p.country_code ?? '' },
      ])
    );
    const creatorProfile = profileMap.get(creatorUserId);
    const requesterProfile = profileMap.get(requesterUserId);
    const creatorName = creatorProfile?.display_name ?? 'Creator';
    const requesterName = requesterProfile?.display_name ?? 'Requester';
    const isWiseCountry = creatorProfile?.country_code ? WISE_COUNTRIES.includes(creatorProfile.country_code as any) : false;

    const completedAtStr = gigCompletedAt.toLocaleDateString('en-GB', { dateStyle: 'long', timeStyle: 'short' });

    if (creatorEmail) {
      await SendGridService.sendGigCreatorPaymentReceipt({
        to: creatorEmail,
        creator_name: creatorName,
        gig_title: gigTitle,
        requester_name: requesterName,
        gross_amount: grossAmount.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        creator_earnings: creatorEarnings.toFixed(2),
        wallet_balance: newWalletBalance.toFixed(2),
        currency: currency === 'USD' ? 'USD' : currency,
        gig_completed_at: completedAtStr,
        withdrawal_cta_url: `${WITHDRAWAL_CTA_URL}/wallet`,
        is_wise_country: isWiseCountry,
      });
    }

    if (requesterEmail) {
      await SendGridService.sendGigRequesterPaymentConfirmation({
        to: requesterEmail,
        requester_name: requesterName,
        creator_name: creatorName,
        gig_title: gigTitle,
        amount_charged: grossAmount.toFixed(2),
        gig_completed_at: completedAtStr,
        stripe_receipt_url: stripeReceiptUrl || '',
        gig_view_url: `${GIG_VIEW_BASE}/${projectId}`,
      });
    }
  } catch (emailError) {
    console.error('[GigPayment] Email receipt failed — wallet credit succeeded', emailError);
  }
}
