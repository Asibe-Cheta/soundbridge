import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailData {
  to: string;
  from?: string;
  fromName?: string;
  templateId: string;
  dynamicTemplateData: Record<string, any>;
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
    const msg = {
      to: emailData.to,
      from: {
        email: emailData.from || this.fromEmail,
        name: emailData.fromName || this.fromName
      },
      templateId: emailData.templateId,
      dynamicTemplateData: emailData.dynamicTemplateData
    };

    await sgMail.send(msg);
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
