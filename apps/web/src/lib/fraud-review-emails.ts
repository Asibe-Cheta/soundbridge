/**
 * Fraud review emails — only on payout withheld or ban (spec Part 5).
 */

import { PlainTextEmailService } from '@/src/lib/plain-text-email-service';

export async function sendFraudPayoutWithheldEmail(to: string, creatorName: string): Promise<boolean> {
  return PlainTextEmailService.sendPlainTextEmail({
    to,
    subject: 'Your SoundBridge payout is under review',
    text: `Hi ${creatorName},

Your payout for this period is under review. We will be in touch within 5 working days.

If you have questions, reply to this email or contact contact@soundbridge.live.

SoundBridge Team`,
  });
}

export async function sendFraudAccountBannedEmail(to: string, creatorName: string): Promise<boolean> {
  return PlainTextEmailService.sendPlainTextEmail({
    to,
    subject: 'Important: Your SoundBridge account has been suspended',
    text: `Hi ${creatorName},

Your account has been suspended due to a violation of our platform terms regarding play count integrity.

If you believe this is an error, contact contact@soundbridge.live.

SoundBridge Team`,
  });
}
