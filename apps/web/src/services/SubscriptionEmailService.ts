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
