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
