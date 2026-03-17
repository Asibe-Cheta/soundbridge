/**
 * UK-compliant subscription invoice and billing emails.
 * WEB_TEAM_SUBSCRIPTION_BILLING_INVOICES.MD
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { SendGridService } from './sendgrid-service';

const COMPANY = {
  name: 'SoundBridge Live Ltd',
  number: '16854928',
  email: 'contact@soundbridge.live',
  website: 'soundbridge.live',
  registeredAddress: '4 Whitlock House, 2 Cedar Grove, Wokingham, UK',
  vatNote: 'VAT not applicable — SoundBridge Live Ltd is not currently VAT registered',
} as const;

const LOGO_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/logos/logo-trans-lockup.png`;
const BILLING_URL = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/billing`;
const UPGRADE_URL = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/upgrade`;

export interface InvoiceReceiptData {
  invoiceNumber: string;
  invoiceDate: string;
  paymentCollectedDate: string;
  customerName: string;
  customerEmail: string;
  billingAddressFormatted: string;
  planName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billingCycle: string;
  unitPriceFormatted: string;
  quantity: number;
  subtotalFormatted: string;
  discountFormatted: string | null;
  totalChargedFormatted: string;
  paymentMethodLast4: string;
  transactionReference: string;
}

/** Get next sequential invoice number (INV-00001, ...). Calls RPC get_next_invoice_number. */
export async function getNextInvoiceNumber(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_invoice_number');
  if (error) throw new Error(`get_next_invoice_number failed: ${error.message}`);
  return data as string;
}

/** Store mapping from Stripe invoice ID to our public invoice number. */
export async function storeSubscriptionInvoice(
  supabase: SupabaseClient,
  stripeInvoiceId: string,
  invoiceNumber: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('subscription_invoices').insert({
    stripe_invoice_id: stripeInvoiceId,
    invoice_number: invoiceNumber,
    user_id: userId,
  });
  if (error) throw new Error(`storeSubscriptionInvoice failed: ${error.message}`);
}

function formatDate(isoOrUnix: string | number): string {
  const date = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(isoOrUnix: string | number): string {
  const date = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildInvoiceReceiptHtml(data: InvoiceReceiptData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: Arial, sans-serif; background:#f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 32px;">
    <div style="text-align: right; margin-bottom: 24px;">
      <img src="${LOGO_URL}" alt="SoundBridge" height="110" style="object-fit: contain;" />
    </div>
    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">INVOICE</h1>
    <p style="margin: 0 0 24px 0; color: #666;">${data.invoiceNumber} · ${data.invoiceDate}</p>
    <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #C0392B;">${data.totalChargedFormatted}</p>
    <p style="margin: 0 0 32px 0;"><span style="display: inline-block; padding: 4px 12px; background: #27ae60; color: #fff; font-weight: bold; border-radius: 4px;">PAID</span></p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr><td style="padding: 6px 0; color: #666;">Invoice Date</td><td style="padding: 6px 0;">${data.invoiceDate}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Payment Collected</td><td style="padding: 6px 0;">${data.paymentCollectedDate}</td></tr>
    </table>

    <h2 style="font-size: 16px; margin: 24px 0 8px 0;">Customer</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr><td style="padding: 6px 0; color: #666;">Name</td><td style="padding: 6px 0;">${data.customerName || '—'}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${data.customerEmail}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Billing Address</td><td style="padding: 6px 0;">${data.billingAddressFormatted || '—'}</td></tr>
    </table>

    <h2 style="font-size: 16px; margin: 24px 0 8px 0;">Subscription</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr><th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #eee;">Plan</th><th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">Period</th><th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">Unit Price</th><th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">Qty</th></tr>
      <tr><td style="padding: 8px 0;">${data.planName}</td><td style="padding: 8px 0; text-align: right;">${data.billingPeriodStart} – ${data.billingPeriodEnd}</td><td style="padding: 8px 0; text-align: right;">${data.unitPriceFormatted}</td><td style="padding: 8px 0; text-align: right;">${data.quantity}</td></tr>
    </table>

    <h2 style="font-size: 16px; margin: 24px 0 8px 0;">Financial breakdown</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr><td style="padding: 6px 0;">Subtotal</td><td style="padding: 6px 0; text-align: right;">${data.subtotalFormatted}</td></tr>
      ${data.discountFormatted ? `<tr><td style="padding: 6px 0;">Discount</td><td style="padding: 6px 0; text-align: right;">${data.discountFormatted}</td></tr>` : ''}
      <tr><td style="padding: 6px 0;">VAT</td><td style="padding: 6px 0; text-align: right;">${COMPANY.vatNote}</td></tr>
      <tr><td style="padding: 12px 0; font-weight: bold;">Total Charged</td><td style="padding: 12px 0; text-align: right; font-weight: bold;">${data.totalChargedFormatted}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Payment method</td><td style="padding: 6px 0;">Card ending ${data.paymentMethodLast4 || '****'}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Transaction reference</td><td style="padding: 6px 0;">${data.transactionReference}</td></tr>
    </table>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
    <p style="margin: 0 0 8px 0;">Thank you for subscribing to SoundBridge Live.</p>
    <p style="margin: 0 0 8px 0;"><a href="${BILLING_URL}" style="color: #C0392B;">Manage or cancel your subscription</a></p>
    <p style="margin: 0 0 8px 0;">For support, contact ${COMPANY.email}</p>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #666;">${COMPANY.name}<br />Co. No. ${COMPANY.number}<br />${COMPANY.registeredAddress}<br />${COMPANY.email} · ${COMPANY.website}</p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendInvoiceReceipt(to: string, data: InvoiceReceiptData): Promise<boolean> {
  const subject = `${data.invoiceNumber} — Your SoundBridge Live subscription`;
  const html = buildInvoiceReceiptHtml(data);
  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: COMPANY.email,
    fromName: COMPANY.name,
  });
}

export interface PaymentFailedEmailData {
  customerName: string;
  amountFormatted: string;
  reason?: string;
  nextRetryDate: string | null;
  updatePaymentUrl: string;
  noMoreRetries?: boolean;
}

export function buildPaymentFailedHtml(data: PaymentFailedEmailData): string {
  const reason = data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : '';
  const nextRetry = data.nextRetryDate && !data.noMoreRetries
    ? `<p><strong>Next automatic retry:</strong> ${formatDateTime(data.nextRetryDate)}</p>`
    : '';
  const warning = data.noMoreRetries
    ? '<p style="color: #C0392B;"><strong>There are no more retries. Your subscription will be cancelled unless you update your payment method.</strong></p>'
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #333;">Action required: Payment failed</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>Payment for your SoundBridge Live subscription could not be collected.</p>
    <p><strong>Amount that failed:</strong> ${data.amountFormatted}</p>
    ${reason}
    ${nextRetry}
    ${warning}
    <p style="margin-top: 24px;"><a href="${data.updatePaymentUrl}" style="display: inline-block; padding: 12px 24px; background: #C0392B; color: #fff; text-decoration: none; border-radius: 6px;">Update Payment Method</a></p>
    <hr style="margin: 32px 0;" />
    <p style="font-size: 12px; color: #666;">For support, contact ${COMPANY.email}. SoundBridge Live Ltd · Company No. ${COMPANY.number}</p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendPaymentFailedEmail(to: string, data: PaymentFailedEmailData): Promise<boolean> {
  const subject = 'Action required: Payment failed for your SoundBridge Live subscription';
  const html = buildPaymentFailedHtml(data);
  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: COMPANY.email,
    fromName: COMPANY.name,
  });
}

export interface SubscriptionCancelledEmailData {
  customerName: string;
  accessEndDate: string;
  resubscribeUrl: string;
}

export function buildSubscriptionCancelledHtml(data: SubscriptionCancelledEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #333;">Your SoundBridge Live subscription has been cancelled</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>Your subscription has been cancelled as requested.</p>
    <p><strong>Access end date:</strong> ${data.accessEndDate}</p>
    <p>You can resubscribe anytime.</p>
    <p style="margin-top: 24px;"><a href="${data.resubscribeUrl}" style="display: inline-block; padding: 12px 24px; background: #C0392B; color: #fff; text-decoration: none; border-radius: 6px;">Resubscribe</a></p>
    <hr style="margin: 32px 0;" />
    <p style="font-size: 12px; color: #666;">For support, contact ${COMPANY.email}. SoundBridge Live Ltd · Company No. ${COMPANY.number}</p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendSubscriptionCancelledEmail(to: string, data: SubscriptionCancelledEmailData): Promise<boolean> {
  const subject = 'Your SoundBridge Live subscription has been cancelled';
  const html = buildSubscriptionCancelledHtml(data);
  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: COMPANY.email,
    fromName: COMPANY.name,
  });
}

export interface SubscriptionPlanChangeEmailData {
  customerName: string;
  planName: string;
  billingUrl: string;
}

export function buildSubscriptionPlanChangeHtml(data: SubscriptionPlanChangeEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #333;">Your SoundBridge Live subscription has been updated</h1>
    <p>Hi ${data.customerName || 'there'},</p>
    <p>Your subscription plan has been updated to <strong>${data.planName}</strong>.</p>
    <p><a href="${data.billingUrl}">Manage your subscription</a></p>
    <hr style="margin: 32px 0;" />
    <p style="font-size: 12px; color: #666;">For support, contact ${COMPANY.email}. SoundBridge Live Ltd · Company No. ${COMPANY.number}</p>
  </div>
</body>
</html>
  `.trim();
}

export async function sendSubscriptionPlanChangeEmail(to: string, data: SubscriptionPlanChangeEmailData): Promise<boolean> {
  const subject = 'Your SoundBridge Live subscription has been updated';
  const html = buildSubscriptionPlanChangeHtml(data);
  return SendGridService.sendHtmlEmail(to, subject, html, {
    from: COMPANY.email,
    fromName: COMPANY.name,
  });
}
