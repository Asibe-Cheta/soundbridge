import { SendGridService } from '../lib/sendgrid-service';
import { createClient } from '@supabase/supabase-js';

export interface SubscriptionConfirmationData {
  userEmail: string;
  userName: string;
  billingCycle: 'monthly' | 'yearly';
  amount: string;
  currency: string;
  subscriptionStartDate: string;
  nextBillingDate: string;
  invoiceUrl?: string;
}

export interface PaymentReceiptData {
  userEmail: string;
  userName: string;
  amount: string;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  paymentDate: string;
  invoiceNumber: string;
  invoiceUrl?: string;
  nextBillingDate: string;
}

export interface PaymentFailedData {
  userEmail: string;
  userName: string;
  amount: string;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  paymentDate: string;
  gracePeriodEndDate: string;
  updatePaymentUrl: string;
}

export interface AccountDowngradedData {
  userEmail: string;
  userName: string;
  downgradeReason: 'payment_failed' | 'cancelled' | 'expired';
  downgradeDate: string;
  reactivateUrl: string;
}

export interface EventCancellationData {
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  ticketCodes: string[];
  refundAmount: string;
  cancellationReason: string;
  refundTimeline?: string;
}

export interface TicketConfirmationData {
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string;
  eventVenue?: string;
  ticketCodes: string[];
  quantity: number;
  amountPaid: string;
  currency: string;
  purchaseDate: string;
  paymentIntentId: string;
  organizerName?: string;
  organizerEmail?: string;
}

export class SubscriptionEmailService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Send subscription confirmation email when user upgrades
   */
  static async sendSubscriptionConfirmation(
    data: SubscriptionConfirmationData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID not configured');
        return false;
      }

      const billingCycleText = data.billingCycle === 'monthly' ? 'Monthly' : 'Yearly';
      const planName = `Pro (${billingCycleText})`;

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          plan_name: planName,
          billing_cycle: billingCycleText,
          amount: data.amount,
          currency: data.currency,
          subscription_start_date: new Date(data.subscriptionStartDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          next_billing_date: new Date(data.nextBillingDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          invoice_url: data.invoiceUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing`,
          dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge',
          money_back_guarantee_text: '7-day money-back guarantee'
        },
        subject: `Welcome to SoundBridge Pro! 🎉`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Subscription confirmation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending subscription confirmation email:', error);
      return false;
    }
  }

  /**
   * Send payment receipt email
   */
  static async sendPaymentReceipt(
    data: PaymentReceiptData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_PAYMENT_RECEIPT_TEMPLATE_ID not configured');
        return false;
      }

      const billingCycleText = data.billingCycle === 'monthly' ? 'Monthly' : 'Yearly';

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          amount: data.amount,
          currency: data.currency,
          billing_cycle: billingCycleText,
          payment_date: new Date(data.paymentDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          invoice_number: data.invoiceNumber,
          invoice_url: data.invoiceUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing`,
          next_billing_date: new Date(data.nextBillingDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge'
        },
        subject: `Payment Receipt - ${data.amount} ${data.currency}`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Payment receipt email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending payment receipt email:', error);
      return false;
    }
  }

  /**
   * Send payment failed/declined email
   */
  static async sendPaymentFailed(
    data: PaymentFailedData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_PAYMENT_FAILED_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_PAYMENT_FAILED_TEMPLATE_ID not configured');
        return false;
      }

      const gracePeriodDays = Math.ceil(
        (new Date(data.gracePeriodEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          amount: data.amount,
          currency: data.currency,
          billing_cycle: data.billingCycle === 'monthly' ? 'Monthly' : 'Yearly',
          payment_date: new Date(data.paymentDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          grace_period_days: gracePeriodDays,
          grace_period_end_date: new Date(data.gracePeriodEndDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          update_payment_url: data.updatePaymentUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing&action=update-payment`,
          dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge'
        },
        subject: `⚠️ Payment Failed - Action Required`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Payment failed email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending payment failed email:', error);
      return false;
    }
  }

  /**
   * Send account downgraded email (after grace period expires)
   */
  static async sendAccountDowngraded(
    data: AccountDowngradedData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_ACCOUNT_DOWNGRADED_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_ACCOUNT_DOWNGRADED_TEMPLATE_ID not configured');
        return false;
      }

      let reasonText = '';
      switch (data.downgradeReason) {
        case 'payment_failed':
          reasonText = 'Your payment could not be processed and the grace period has ended.';
          break;
        case 'cancelled':
          reasonText = 'Your subscription has been cancelled as requested.';
          break;
        case 'expired':
          reasonText = 'Your subscription has expired.';
          break;
      }

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          downgrade_reason: reasonText,
          downgrade_date: new Date(data.downgradeDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          reactivate_url: data.reactivateUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
          dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge'
        },
        subject: `Your SoundBridge Pro subscription has ended`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Account downgraded email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending account downgraded email:', error);
      return false;
    }
  }

  /**
   * Send event cancellation email to ticket purchasers
   */
  static async sendEventCancellation(
    data: EventCancellationData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_EVENT_CANCELLATION_TEMPLATE_ID;

      if (!templateId) {
        console.warn('SENDGRID_EVENT_CANCELLATION_TEMPLATE_ID not configured - using basic email');
        // Fall back to basic email if template not configured
        return await this.sendEventCancellationBasic(data);
      }

      const ticketCodesText = data.ticketCodes.join(', ');
      const refundTimeline = data.refundTimeline || '5-10 business days';

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          event_title: data.eventTitle,
          event_date: new Date(data.eventDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          ticket_codes: ticketCodesText,
          refund_amount: data.refundAmount,
          cancellation_reason: data.cancellationReason,
          refund_timeline: refundTimeline,
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge',
          events_url: `${process.env.NEXT_PUBLIC_APP_URL}/events`
        },
        subject: `Event Cancelled: ${data.eventTitle}`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Event cancellation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending event cancellation email:', error);
      return false;
    }
  }

  /**
   * Send basic event cancellation email (fallback without template)
   */
  private static async sendEventCancellationBasic(
    data: EventCancellationData
  ): Promise<boolean> {
    try {
      const ticketCodesText = data.ticketCodes.join(', ');
      const refundTimeline = data.refundTimeline || '5-10 business days';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Event Cancelled</h1>

          <p>Hi ${data.userName},</p>

          <p>We're sorry to inform you that the following event has been cancelled:</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333;">${data.eventTitle}</h2>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(data.eventDate).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin: 5px 0;"><strong>Ticket Code(s):</strong> ${ticketCodesText}</p>
          </div>

          <h3>Refund Information</h3>
          <p><strong>Refund Amount:</strong> ${data.refundAmount}</p>
          <p>Your refund has been processed and should appear in your account within ${refundTimeline}.</p>

          <h3>Cancellation Reason</h3>
          <p>${data.cancellationReason}</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

          <p>We apologize for any inconvenience this may cause. You can browse other events on SoundBridge:</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/events" style="color: #0066cc;">Browse Events</a></p>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            If you have any questions, please contact us at support@soundbridge.live
          </p>
        </div>
      `;

      const textContent = `
Event Cancelled

Hi ${data.userName},

We're sorry to inform you that the following event has been cancelled:

Event: ${data.eventTitle}
Date: ${new Date(data.eventDate).toLocaleDateString('en-GB')}
Ticket Code(s): ${ticketCodesText}

Refund Information:
Amount: ${data.refundAmount}
Timeline: ${refundTimeline}

Cancellation Reason:
${data.cancellationReason}

We apologize for any inconvenience this may cause.

If you have any questions, please contact us at support@soundbridge.live

SoundBridge Team
      `.trim();

      await SendGridService.sendEmail({
        to: data.userEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@soundbridge.live',
        subject: `Event Cancelled: ${data.eventTitle}`,
        html: htmlContent,
        text: textContent
      });

      console.log(`✅ Basic event cancellation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending basic event cancellation email:', error);
      return false;
    }
  }

  /**
   * Send ticket purchase confirmation email to buyer
   */
  static async sendTicketConfirmation(
    data: TicketConfirmationData
  ): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID;

      if (!templateId) {
        console.warn('SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID not configured - using basic email');
        // Fall back to basic email if template not configured
        return await this.sendTicketConfirmationBasic(data);
      }

      const ticketCodesText = data.ticketCodes.join(', ');
      const currencySymbol = data.currency.toUpperCase() === 'GBP' ? '£' : '₦';

      const emailData = {
        to: data.userEmail,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          event_title: data.eventTitle,
          event_date: new Date(data.eventDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          event_location: data.eventLocation || 'See event details',
          event_venue: data.eventVenue || '',
          ticket_codes: ticketCodesText,
          ticket_quantity: data.quantity,
          amount_paid: `${currencySymbol}${data.amountPaid}`,
          currency: data.currency.toUpperCase(),
          purchase_date: new Date(data.purchaseDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          payment_intent_id: data.paymentIntentId,
          organizer_name: data.organizerName || 'Event Organizer',
          organizer_email: data.organizerEmail || 'support@soundbridge.live',
          support_email: 'support@soundbridge.live',
          app_name: 'SoundBridge',
          app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://soundbridge.live',
          my_tickets_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/dashboard`,
        },
        subject: `Your Ticket for ${data.eventTitle} - Confirmation`
      };

      await SendGridService.sendTemplatedEmail(emailData);
      console.log(`✅ Ticket confirmation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending ticket confirmation email:', error);
      return false;
    }
  }

  /**
   * Send basic ticket confirmation email (fallback without template)
   */
  private static async sendTicketConfirmationBasic(
    data: TicketConfirmationData
  ): Promise<boolean> {
    try {
      const ticketCodesText = data.ticketCodes.join(', ');
      const currencySymbol = data.currency.toUpperCase() === 'GBP' ? '£' : '₦';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎫 Ticket Confirmed!</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Hi ${data.userName},</p>

              <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 30px 0;">
                Great news! Your ticket purchase has been confirmed. You're all set for:
              </p>

              <!-- Event Details Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid #EC4899; padding: 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <h2 style="color: #EC4899; margin: 0 0 15px 0; font-size: 22px;">${data.eventTitle}</h2>
                <p style="margin: 8px 0; color: #555; font-size: 15px;">
                  <strong>📅 Date:</strong> ${new Date(data.eventDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                ${data.eventLocation ? `
                  <p style="margin: 8px 0; color: #555; font-size: 15px;">
                    <strong>📍 Location:</strong> ${data.eventLocation}
                  </p>
                ` : ''}
                ${data.eventVenue ? `
                  <p style="margin: 8px 0; color: #555; font-size: 15px;">
                    <strong>🏛️ Venue:</strong> ${data.eventVenue}
                  </p>
                ` : ''}
              </div>

              <!-- Ticket Codes -->
              <div style="background-color: #FEF3C7; border: 2px dashed #F59E0B; padding: 25px; margin: 0 0 30px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #92400E; font-size: 14px; font-weight: 600;">YOUR TICKET CODE${data.quantity > 1 ? 'S' : ''}</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #EC4899; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                  ${ticketCodesText}
                </p>
                <p style="margin: 15px 0 0 0; color: #92400E; font-size: 12px;">
                  Please present this code at the event entrance
                </p>
              </div>

              <!-- Purchase Details -->
              <div style="background-color: #f3f4f6; padding: 20px; margin: 0 0 30px 0; border-radius: 6px;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Purchase Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Quantity:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 600;">${data.quantity} ticket${data.quantity > 1 ? 's' : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount Paid:</td>
                    <td style="padding: 8px 0; color: #EC4899; font-size: 16px; text-align: right; font-weight: 700;">${currencySymbol}${data.amountPaid}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Purchase Date:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${new Date(data.purchaseDate).toLocaleDateString('en-GB')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Transaction ID:</td>
                    <td style="padding: 8px 0; color: #666; font-size: 12px; text-align: right; font-family: monospace;">${data.paymentIntentId.substring(0, 20)}...</td>
                  </tr>
                </table>
              </div>

              <!-- Important Information -->
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #1E40AF; font-size: 16px;">📌 Important Information</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1E3A8A; font-size: 14px; line-height: 1.8;">
                  <li>Please arrive 15-30 minutes before the event starts</li>
                  <li>Have your ticket code ready for scanning</li>
                  <li>Bring a valid ID for verification</li>
                  <li>Tickets are non-transferable</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/dashboard" style="display: inline-block; background-color: #EC4899; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Tickets</a>
              </div>

              <!-- Organizer Contact -->
              ${data.organizerName || data.organizerEmail ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    <strong>Event Organizer:</strong> ${data.organizerName || 'Event Organizer'}
                  </p>
                  ${data.organizerEmail ? `
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      <strong>Contact:</strong> <a href="mailto:${data.organizerEmail}" style="color: #EC4899;">${data.organizerEmail}</a>
                    </p>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Footer -->
            <div style="background-color: #1a1a2e; padding: 30px 20px; text-align: center;">
              <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">
                Questions? Contact us at <a href="mailto:support@soundbridge.live" style="color: #EC4899; text-decoration: none;">support@soundbridge.live</a>
              </p>
              <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                © ${new Date().getFullYear()} SoundBridge. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Your Ticket for ${data.eventTitle} - Confirmed!

Hi ${data.userName},

Your ticket purchase has been confirmed! Here are your details:

EVENT DETAILS:
Event: ${data.eventTitle}
Date: ${new Date(data.eventDate).toLocaleDateString('en-GB')}
${data.eventLocation ? `Location: ${data.eventLocation}` : ''}
${data.eventVenue ? `Venue: ${data.eventVenue}` : ''}

YOUR TICKET CODE${data.quantity > 1 ? 'S' : ''}:
${ticketCodesText}

Please present this code at the event entrance.

PURCHASE DETAILS:
Quantity: ${data.quantity} ticket${data.quantity > 1 ? 's' : ''}
Amount Paid: ${currencySymbol}${data.amountPaid}
Purchase Date: ${new Date(data.purchaseDate).toLocaleDateString('en-GB')}
Transaction ID: ${data.paymentIntentId}

IMPORTANT:
- Arrive 15-30 minutes before the event
- Have your ticket code ready for scanning
- Bring a valid ID for verification
- Tickets are non-transferable

View your tickets: ${process.env.NEXT_PUBLIC_APP_URL}/events/dashboard

${data.organizerName ? `Event Organizer: ${data.organizerName}` : ''}
${data.organizerEmail ? `Contact: ${data.organizerEmail}` : ''}

Questions? Contact support@soundbridge.live

© ${new Date().getFullYear()} SoundBridge. All rights reserved.
      `.trim();

      await SendGridService.sendEmail({
        to: data.userEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@soundbridge.live',
        subject: `Your Ticket for ${data.eventTitle} - Confirmation`,
        html: htmlContent,
        text: textContent
      });

      console.log(`✅ Basic ticket confirmation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending basic ticket confirmation email:', error);
      return false;
    }
  }

  /**
   * Get user email and name from database
   */
  static async getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      // Get user email from auth
      const { data: { user }, error: authError } = await this.supabase.auth.admin.getUserById(userId);

      if (authError || !user) {
        console.error('Error fetching user from auth:', authError);
        return null;
      }

      // Get user profile for display name
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', userId)
        .single();

      const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';

      return {
        email: user.email || '',
        name: displayName
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }
}
