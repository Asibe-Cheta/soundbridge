// Dynamic import so build can run without loading @sendgrid/mail (which throws when apiKey is missing)
let _sgMail: { setApiKey: (k: string) => void; send: (msg: any) => Promise<any> } | null | undefined = undefined;
async function getSgMail(): Promise<{ setApiKey: (k: string) => void; send: (msg: any) => Promise<any> } | null> {
  if (_sgMail !== undefined) return _sgMail;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    _sgMail = null;
    return null;
  }
  const m = await import('@sendgrid/mail');
  m.default.setApiKey(key);
  _sgMail = m.default;
  return _sgMail;
}

function ensureSendGridKey(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

export interface EmailData {
  to: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  templateId: string;
  dynamicTemplateData: Record<string, any>;
  subject?: string; // Optional subject override for dynamic templates
  headers?: Record<string, string>;
  categories?: string[];
}

export interface PasswordResetData {
  to: string;
  resetUrl: string;
  userName?: string;
}

export interface SignupConfirmationData {
  to: string;
  userName: string;
  confirmationUrl?: string;
}

export interface PurchaseConfirmationData {
  to: string;
  userName: string;
  contentTitle: string;
  creatorName: string;
  pricePaid: number;
  currency: string;
  transactionId: string;
  purchaseDate: string;
  libraryUrl: string;
}

export interface SaleNotificationData {
  to: string;
  creatorName: string;
  contentTitle: string;
  buyerUsername: string;
  amountEarned: number;
  currency: string;
  analyticsUrl: string;
}

/** WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md — creator earnings receipt */
export interface GigCreatorReceiptData {
  to: string;
  creator_name: string;
  gig_title: string;
  requester_name: string;
  gross_amount: string;
  platform_fee: string;
  creator_earnings: string;
  wallet_balance: string;
  currency: string;
  gig_completed_at: string;
  withdrawal_cta_url: string;
  is_wise_country?: boolean;
}

/** WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md — requester payment confirmation */
export interface GigRequesterConfirmationData {
  to: string;
  requester_name: string;
  creator_name: string;
  gig_title: string;
  amount_charged: string;
  gig_completed_at: string;
  stripe_receipt_url: string;
  gig_view_url: string;
}

export class SendGridService {
  private static fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live';
  private static fromName = process.env.SENDGRID_FROM_NAME || 'SoundBridge Team';

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_RESET_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_RESET_TEMPLATE_ID not configured');
        return false;
      }

      const emailData: EmailData = {
        to: data.to,
        from: this.fromEmail,
        fromName: this.fromName,
        templateId,
        dynamicTemplateData: {
          reset_url: data.resetUrl,
          user_name: data.userName || 'User',
          app_name: 'SoundBridge',
          support_email: 'contact@soundbridge.live'
        }
      };

      await this.sendEmail(emailData);
      console.log(`Password reset email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send signup confirmation email
   */
  static async sendSignupConfirmationEmail(data: SignupConfirmationData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_SIGNUP_TEMPLATE_ID;
      
      if (!templateId) {
        console.error('SENDGRID_SIGNUP_TEMPLATE_ID not configured');
        return false;
      }

      const emailData: EmailData = {
        to: data.to,
        from: this.fromEmail,
        fromName: this.fromName,
        templateId,
        dynamicTemplateData: {
          user_name: data.userName,
          confirmation_url: data.confirmationUrl || '',
          app_name: 'SoundBridge',
          support_email: 'contact@soundbridge.live'
        }
      };

      await this.sendEmail(emailData);
      console.log(`Signup confirmation email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending signup confirmation email:', error);
      return false;
    }
  }

  /**
   * Generic email sending method
   */
  private static async sendEmail(emailData: EmailData): Promise<void> {
    const sgMail = await getSgMail();
    if (!sgMail) {
      throw new Error('SENDGRID_API_KEY is not configured in environment variables');
    }

    const msg: any = {
      to: emailData.to,
      from: {
        email: emailData.from || this.fromEmail,
        name: emailData.fromName || this.fromName
      },
      replyTo: emailData.replyTo || 'contact@soundbridge.live', // Allow users to reply
      templateId: emailData.templateId,
      dynamicTemplateData: emailData.dynamicTemplateData,
      // Add headers for better deliverability
      headers: {
        'X-Entity-Ref-ID': `soundbridge-${Date.now()}`,
        'X-Mailer': 'SoundBridge Platform',
        'List-Unsubscribe': '<mailto:contact@soundbridge.live?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        ...(emailData.headers || {})
        // Removed high-priority headers to reduce spam flags
      },
      // Add categories for tracking and filtering
      categories: emailData.categories || ['transactional', 'soundbridge']
    };

    // Add subject if provided (overrides template subject)
    if (emailData.subject) {
      msg.subject = emailData.subject;
    } else if (emailData.dynamicTemplateData?.subject) {
      msg.subject = String(emailData.dynamicTemplateData.subject);
    }

    // Force subject override for dynamic templates
    if (msg.subject) {
      msg.personalizations = [
        {
          to: [{ email: emailData.to }],
          subject: msg.subject,
          dynamicTemplateData: emailData.dynamicTemplateData
        }
      ];
    }

    console.log('📧 SendGrid email payload:', {
      to: msg.to,
      from: msg.from.email,
      templateId: msg.templateId,
      hasDynamicData: !!msg.dynamicTemplateData,
      dynamicDataKeys: Object.keys(msg.dynamicTemplateData || {})
    });

    try {
      const result = await sgMail.send(msg);
      console.log('✅ SendGrid email sent successfully');
      console.log('📧 SendGrid response status:', result[0]?.statusCode);
      console.log('📧 SendGrid response headers:', result[0]?.headers);
    } catch (error: any) {
      console.error('❌ SendGrid email sending failed');
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response?.body);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Send any templated email payload via SendGrid
   */
  static async sendTemplatedEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!emailData.templateId) {
        console.error('❌ SendGrid templateId missing for templated email');
        console.error('Email data received:', {
          to: emailData.to,
          from: emailData.from,
          hasTemplateId: !!emailData.templateId
        });
        return false;
      }

      if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY is not configured');
        return false;
      }

      // Ensure subject is set if provided in dynamic template data
      if (!emailData.subject && emailData.dynamicTemplateData?.subject) {
        emailData.subject = String(emailData.dynamicTemplateData.subject);
      }

      console.log('📧 Attempting to send templated email via SendGrid');
      console.log('📧 Template ID:', emailData.templateId);
      console.log('📧 Recipient:', emailData.to);
      
      await this.sendEmail(emailData);
      
      console.log('✅ Templated email sent successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error sending SendGrid templated email');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      if (error?.response) {
        console.error('SendGrid API response:', error.response.body);
        console.error('SendGrid API status:', error.response.statusCode);
      }
      console.error('Full error stack:', error?.stack);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  static async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if API key is configured
      if (!process.env.SENDGRID_API_KEY) {
        return { success: false, error: 'SENDGRID_API_KEY not configured' };
      }

      // Check if template IDs are configured
      if (!process.env.SENDGRID_RESET_TEMPLATE_ID) {
        return { success: false, error: 'SENDGRID_RESET_TEMPLATE_ID not configured' };
      }

      if (!process.env.SENDGRID_SIGNUP_TEMPLATE_ID) {
        return { success: false, error: 'SENDGRID_SIGNUP_TEMPLATE_ID not configured' };
      }

      // Test API key by making a simple request
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return { success: false, error: 'Invalid SendGrid API key' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send purchase confirmation email to buyer
   */
  static async sendPurchaseConfirmationEmail(data: PurchaseConfirmationData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_PURCHASE_CONFIRMATION_TEMPLATE_ID;
      
      if (!templateId) {
        // Fallback to plain text email if template not configured
        console.warn('SENDGRID_PURCHASE_CONFIRMATION_TEMPLATE_ID not configured - using plain text fallback');
        return await this.sendPlainTextPurchaseConfirmation(data);
      }

      const emailData: EmailData = {
        to: data.to,
        from: this.fromEmail,
        fromName: this.fromName,
        templateId,
        subject: `Your SoundBridge Purchase: ${data.contentTitle}`,
        dynamicTemplateData: {
          user_name: data.userName,
          content_title: data.contentTitle,
          creator_name: data.creatorName,
          price_paid: data.pricePaid,
          currency: data.currency,
          currency_symbol: data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€',
          transaction_id: data.transactionId,
          purchase_date: data.purchaseDate,
          library_url: data.libraryUrl,
          app_name: 'SoundBridge',
          support_email: 'contact@soundbridge.live'
        }
      };

      await this.sendEmail(emailData);
      console.log(`Purchase confirmation email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending purchase confirmation email:', error);
      return false;
    }
  }

  /**
   * Send sale notification email to creator
   */
  static async sendSaleNotificationEmail(data: SaleNotificationData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_SALE_NOTIFICATION_TEMPLATE_ID;
      
      if (!templateId) {
        // Fallback to plain text email if template not configured
        console.warn('SENDGRID_SALE_NOTIFICATION_TEMPLATE_ID not configured - using plain text fallback');
        return await this.sendPlainTextSaleNotification(data);
      }

      const emailData: EmailData = {
        to: data.to,
        from: this.fromEmail,
        fromName: this.fromName,
        templateId,
        subject: `🎉 New Sale: ${data.contentTitle}`,
        dynamicTemplateData: {
          creator_name: data.creatorName,
          content_title: data.contentTitle,
          buyer_username: data.buyerUsername,
          amount_earned: data.amountEarned,
          currency: data.currency,
          currency_symbol: data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€',
          analytics_url: data.analyticsUrl,
          app_name: 'SoundBridge',
          support_email: 'contact@soundbridge.live'
        }
      };

      await this.sendEmail(emailData);
      console.log(`Sale notification email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending sale notification email:', error);
      return false;
    }
  }

  /**
   * Fallback: Plain text purchase confirmation
   */
  private static async sendPlainTextPurchaseConfirmation(data: PurchaseConfirmationData): Promise<boolean> {
    try {
      const sgMail = await getSgMail();
      if (!sgMail) return false;
      const currencySymbol = data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Purchase Confirmed!</h1>
          <p>Thank you for your purchase on SoundBridge, ${data.userName}!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${data.contentTitle}</h2>
            <p>by ${data.creatorName}</p>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb;">${currencySymbol}${data.pricePaid.toFixed(2)}</p>
          </div>
          
          <p>You can now download and listen to this content anytime.</p>
          
          <a href="${data.libraryUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View in Library
          </a>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>Transaction ID: ${data.transactionId}</p>
            <p>Date: ${data.purchaseDate}</p>
          </div>
        </div>
      `;

      const msg: any = {
        to: data.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: `Your SoundBridge Purchase: ${data.contentTitle}`,
        html
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Error sending plain text purchase confirmation:', error);
      return false;
    }
  }

  /**
   * Fallback: Plain text sale notification
   */
  private static async sendPlainTextSaleNotification(data: SaleNotificationData): Promise<boolean> {
    try {
      const sgMail = await getSgMail();
      if (!sgMail) return false;
      const currencySymbol = data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You Made a Sale!</h1>
          <p>Great news, ${data.creatorName}! Someone just purchased your content.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>${data.contentTitle}</h2>
            <p>Buyer: @${data.buyerUsername}</p>
            <p style="font-size: 24px; font-weight: bold; color: #10b981;">You earned: ${currencySymbol}${data.amountEarned.toFixed(2)}</p>
            <p style="font-size: 12px; color: #666;">(90% of sale price)</p>
          </div>
          
          <p>The earnings have been added to your digital wallet.</p>
          
          <a href="${data.analyticsUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Sales Dashboard
          </a>
        </div>
      `;

      const msg: any = {
        to: data.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: `🎉 New Sale: ${data.contentTitle}`,
        html
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Error sending plain text sale notification:', error);
      return false;
    }
  }

  /**
   * Send gig creator earnings receipt (WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md)
   */
  static async sendGigCreatorPaymentReceipt(data: GigCreatorReceiptData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_GIG_CREATOR_RECEIPT_TEMPLATE_ID;
      if (!templateId) {
        console.warn('SENDGRID_GIG_CREATOR_RECEIPT_TEMPLATE_ID not configured');
        return false;
      }
      const emailData: EmailData = {
        to: data.to,
        from: process.env.SENDGRID_PAYMENTS_FROM_EMAIL || this.fromEmail,
        fromName: process.env.SENDGRID_PAYMENTS_FROM_NAME || 'SoundBridge Payments',
        templateId,
        subject: `You earned $${data.creator_earnings} on SoundBridge`,
        dynamicTemplateData: {
          creator_name: data.creator_name,
          gig_title: data.gig_title,
          requester_name: data.requester_name,
          gross_amount: data.gross_amount,
          platform_fee: data.platform_fee,
          creator_earnings: data.creator_earnings,
          wallet_balance: data.wallet_balance,
          currency: data.currency,
          gig_completed_at: data.gig_completed_at,
          withdrawal_cta_url: data.withdrawal_cta_url,
          is_wise_country: data.is_wise_country ?? false,
        },
      };
      await this.sendEmail(emailData);
      console.log(`Gig creator receipt sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending gig creator receipt:', error);
      return false;
    }
  }

  /**
   * Send gig requester payment confirmation (WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md)
   */
  static async sendGigRequesterPaymentConfirmation(data: GigRequesterConfirmationData): Promise<boolean> {
    try {
      const templateId = process.env.SENDGRID_GIG_REQUESTER_CONFIRMATION_TEMPLATE_ID;
      if (!templateId) {
        console.warn('SENDGRID_GIG_REQUESTER_CONFIRMATION_TEMPLATE_ID not configured');
        return false;
      }
      const emailData: EmailData = {
        to: data.to,
        from: process.env.SENDGRID_PAYMENTS_FROM_EMAIL || this.fromEmail,
        fromName: process.env.SENDGRID_PAYMENTS_FROM_NAME || 'SoundBridge Payments',
        templateId,
        subject: `Your gig payment to ${data.creator_name} is confirmed`,
        dynamicTemplateData: {
          requester_name: data.requester_name,
          creator_name: data.creator_name,
          gig_title: data.gig_title,
          amount_charged: data.amount_charged,
          gig_completed_at: data.gig_completed_at,
          stripe_receipt_url: data.stripe_receipt_url || '#',
          gig_view_url: data.gig_view_url,
        },
      };
      await this.sendEmail(emailData);
      console.log(`Gig requester confirmation sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending gig requester confirmation:', error);
      return false;
    }
  }
}
