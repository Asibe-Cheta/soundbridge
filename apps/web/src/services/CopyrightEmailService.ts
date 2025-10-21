import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface CopyrightEmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class CopyrightEmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'dmca@soundbridge.live';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'SoundBridge Copyright Team';
  }

  /**
   * Send copyright strike email to user
   */
  async sendCopyrightStrikeEmail({
    to,
    username,
    strikeCount,
    trackTitle,
    complainant,
    supportEmail
  }: {
    to: string;
    username: string;
    strikeCount: number;
    trackTitle: string;
    complainant: string;
    supportEmail: string;
  }): Promise<boolean> {
    try {
      const html = this.generateCopyrightStrikeHTML({
        username,
        strikeCount,
        trackTitle,
        complainant,
        supportEmail
      });

      const text = this.generateCopyrightStrikeText({
        username,
        strikeCount,
        trackTitle,
        complainant,
        supportEmail
      });

      await this.sendEmail({
        to,
        subject: `Copyright Strike ${strikeCount}/3 - Content Removed`,
        html,
        text
      });

      return true;
    } catch (error) {
      console.error('Error sending copyright strike email:', error);
      return false;
    }
  }

  /**
   * Send account banned email to user
   */
  async sendAccountBannedEmail({
    to,
    username,
    reason,
    supportEmail
  }: {
    to: string;
    username: string;
    reason: string;
    supportEmail: string;
  }): Promise<boolean> {
    try {
      const html = this.generateAccountBannedHTML({
        username,
        reason,
        supportEmail
      });

      const text = this.generateAccountBannedText({
        username,
        reason,
        supportEmail
      });

      await this.sendEmail({
        to,
        subject: 'Account Permanently Banned - Copyright Violations',
        html,
        text
      });

      return true;
    } catch (error) {
      console.error('Error sending account banned email:', error);
      return false;
    }
  }

  /**
   * Send DMCA confirmation email to complainant
   */
  async sendDMCAConfirmationEmail({
    to,
    complainant,
    trackTitle,
    takedownId,
    actionTaken,
    dmcaEmail
  }: {
    to: string;
    complainant: string;
    trackTitle: string;
    takedownId: string;
    actionTaken: string;
    dmcaEmail: string;
  }): Promise<boolean> {
    try {
      const html = this.generateDMCAConfirmationHTML({
        complainant,
        trackTitle,
        takedownId,
        actionTaken,
        dmcaEmail
      });

      const text = this.generateDMCAConfirmationText({
        complainant,
        trackTitle,
        takedownId,
        actionTaken,
        dmcaEmail
      });

      await this.sendEmail({
        to,
        subject: `Re: DMCA Takedown Notice - ${trackTitle}`,
        html,
        text
      });

      return true;
    } catch (error) {
      console.error('Error sending DMCA confirmation email:', error);
      return false;
    }
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotificationEmail({
    to,
    type,
    reportId,
    contentTitle,
    priority,
    details
  }: {
    to: string;
    type: string;
    reportId: string;
    contentTitle: string;
    priority: string;
    details: string;
  }): Promise<boolean> {
    try {
      const html = this.generateAdminNotificationHTML({
        type,
        reportId,
        contentTitle,
        priority,
        details
      });

      const text = this.generateAdminNotificationText({
        type,
        reportId,
        contentTitle,
        priority,
        details
      });

      await this.sendEmail({
        to,
        subject: `[Admin] ${type} - ${priority} priority`,
        html,
        text
      });

      return true;
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      return false;
    }
  }

  // Private helper methods
  private async sendEmail({ to, subject, html, text }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 EMAIL (Development Mode)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      return;
    }

    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      html,
      text
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  }

  private generateCopyrightStrikeHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Copyright Strike - SoundBridge</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .alert h3 { color: #856404; margin-top: 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Copyright Strike ${data.strikeCount}/3</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Content removed due to copyright complaint</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.username},</p>
          
          <p>Your content has been removed from SoundBridge due to a copyright complaint.</p>
          
          <h3>Details:</h3>
          <ul>
            <li><strong>Track:</strong> ${data.trackTitle}</li>
            <li><strong>Complainant:</strong> ${data.complainant}</li>
            <li><strong>Strike Count:</strong> ${data.strikeCount}/3</li>
          </ul>
          
          <div class="alert">
            <h3>⚠️ Warning</h3>
            <p>If you receive 3 strikes, your account will be permanently banned.</p>
          </div>
          
          <h3>What You Can Do:</h3>
          <ul>
            <li>If you believe this was a mistake, you can file a counter-notice</li>
            <li>Contact us at: ${data.supportEmail}</li>
            <li>Only upload content you own or have rights to</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="https://soundbridge.live/copyright-policy" class="button">Read Copyright Policy</a>
          </div>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact us at: ${data.supportEmail}</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCopyrightStrikeText(data: any): string {
    return `
      COPYRIGHT STRIKE ${data.strikeCount}/3

      Hello ${data.username},

      Your content has been removed from SoundBridge due to a copyright complaint.

      DETAILS:
      - Track: ${data.trackTitle}
      - Complainant: ${data.complainant}
      - Strike Count: ${data.strikeCount}/3

      ⚠️ WARNING: If you receive 3 strikes, your account will be permanently banned.

      WHAT YOU CAN DO:
      - If you believe this was a mistake, you can file a counter-notice
      - Contact us at: ${data.supportEmail}
      - Only upload content you own or have rights to

      Read our Copyright Policy: https://soundbridge.live/copyright-policy

      Need help? Contact us at: ${data.supportEmail}

      © ${new Date().getFullYear()} SoundBridge. All rights reserved.
    `.trim();
  }

  private generateAccountBannedHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Banned - SoundBridge</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: #f8d7da; border: 1px solid #dc3545; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .alert h3 { color: #721c24; margin-top: 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Account Permanently Banned</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Due to repeat copyright violations</p>
        </div>
        
        <div class="content">
          <p>Hello ${data.username},</p>
          
          <p>Your SoundBridge account has been permanently banned due to repeat copyright violations.</p>
          
          <h3>Reason:</h3>
          <p>${data.reason}</p>
          
          <div class="alert">
            <h3>🚫 This decision is final.</h3>
            <p>All your content has been removed from the platform.</p>
          </div>
          
          <h3>If You Believe This Is An Error:</h3>
          <p>Contact us at: ${data.supportEmail} with evidence that you own the rights to the content.</p>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact us at: ${data.supportEmail}</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAccountBannedText(data: any): string {
    return `
      ACCOUNT PERMANENTLY BANNED

      Hello ${data.username},

      Your SoundBridge account has been permanently banned due to repeat copyright violations.

      REASON: ${data.reason}

      🚫 THIS DECISION IS FINAL.
      All your content has been removed from the platform.

      IF YOU BELIEVE THIS IS AN ERROR:
      Contact us at: ${data.supportEmail} with evidence that you own the rights to the content.

      Need help? Contact us at: ${data.supportEmail}

      © ${new Date().getFullYear()} SoundBridge. All rights reserved.
    `.trim();
  }

  private generateDMCAConfirmationHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>DMCA Takedown Processed - SoundBridge</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .success h3 { color: #155724; margin-top: 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">DMCA Takedown Processed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your request has been processed</p>
        </div>
        
        <div class="content">
          <p>Dear ${data.complainant},</p>
          
          <p>Thank you for your DMCA notice. We have processed your request.</p>
          
          <div class="success">
            <h3>✅ Action Taken</h3>
            <p><strong>Content:</strong> ${data.trackTitle}</p>
            <p><strong>Takedown ID:</strong> ${data.takedownId}</p>
            <p><strong>Action:</strong> ${data.actionTaken}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>The content has been removed and is no longer accessible on SoundBridge.</p>
          
          <p>If you need further assistance, please contact: ${data.dmcaEmail}</p>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact us at: ${data.dmcaEmail}</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDMCAConfirmationText(data: any): string {
    return `
      DMCA TAKEDOWN PROCESSED

      Dear ${data.complainant},

      Thank you for your DMCA notice. We have processed your request.

      DETAILS:
      - Content: ${data.trackTitle}
      - Takedown ID: ${data.takedownId}
      - Action: ${data.actionTaken}
      - Date: ${new Date().toLocaleDateString()}

      The content has been removed and is no longer accessible on SoundBridge.

      If you need further assistance, please contact: ${data.dmcaEmail}

      Need help? Contact us at: ${data.dmcaEmail}

      © ${new Date().getFullYear()} SoundBridge. All rights reserved.
    `.trim();
  }

  private generateAdminNotificationHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Admin Notification - SoundBridge</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .alert h3 { color: #856404; margin-top: 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Admin Notification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${data.type} - ${data.priority} priority</p>
        </div>
        
        <div class="content">
          <h3>Details:</h3>
          <ul>
            <li><strong>Type:</strong> ${data.type}</li>
            <li><strong>Report ID:</strong> ${data.reportId}</li>
            <li><strong>Content:</strong> ${data.contentTitle}</li>
            <li><strong>Priority:</strong> ${data.priority}</li>
            <li><strong>Details:</strong> ${data.details}</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="https://soundbridge.live/admin/copyright" class="button">View in Admin Panel</a>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAdminNotificationText(data: any): string {
    return `
      ADMIN NOTIFICATION

      ${data.type} - ${data.priority} priority

      DETAILS:
      - Type: ${data.type}
      - Report ID: ${data.reportId}
      - Content: ${data.contentTitle}
      - Priority: ${data.priority}
      - Details: ${data.details}

      View in Admin Panel: https://soundbridge.live/admin/copyright

      © ${new Date().getFullYear()} SoundBridge. All rights reserved.
    `.trim();
  }
}

export const copyrightEmailService = new CopyrightEmailService();
