import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailData {
  to: string;
  from?: string;
  fromName?: string;
  templateId: string;
  dynamicTemplateData: Record<string, any>;
  subject?: string; // Optional subject override for dynamic templates
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
    // Check if API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured in environment variables');
    }

    const msg: any = {
      to: emailData.to,
      from: {
        email: emailData.from || this.fromEmail,
        name: emailData.fromName || this.fromName
      },
      replyTo: 'contact@soundbridge.live', // Allow users to reply
      templateId: emailData.templateId,
      dynamicTemplateData: emailData.dynamicTemplateData,
      // Add headers for better deliverability
      headers: {
        'X-Entity-Ref-ID': `soundbridge-${Date.now()}`,
        'X-Mailer': 'SoundBridge Platform',
        'Precedence': 'bulk', // Indicates transactional email
        'Auto-Submitted': 'auto-generated', // Indicates automated email
        'List-Unsubscribe': '<mailto:contact@soundbridge.live?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Priority': '3' // Normal priority (not urgent)
      },
      // Add categories for tracking and filtering
      categories: ['account-notification', 'soundbridge', 'transactional']
    };

    // Add subject if provided (overrides template subject)
    if (emailData.subject) {
      msg.subject = emailData.subject;
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
}
