/**
 * Plain Text Email Service
 * Sends simple plain text emails for better deliverability
 * Use this for account notifications that are going to spam
 */

export interface PlainTextEmailData {
  to: string;
  from?: string;
  fromName?: string;
  subject: string;
  text: string;
  html?: string; // Optional minimal HTML version
}

export class PlainTextEmailService {
  private static fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live';
  private static fromName = process.env.SENDGRID_FROM_NAME || 'SoundBridge Team';

  /**
   * Send plain text email (better deliverability for transactional emails)
   */
  static async sendPlainTextEmail(emailData: PlainTextEmailData): Promise<boolean> {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY is not configured');
        return false;
      }

      const msg: any = {
        to: emailData.to,
        from: {
          email: emailData.from || this.fromEmail,
          name: emailData.fromName || this.fromName
        },
        replyTo: 'contact@soundbridge.live',
        subject: emailData.subject,
        text: emailData.text,
        // Add minimal HTML if provided, otherwise create simple HTML from text
        html: emailData.html || this.textToHtml(emailData.text),
        // Headers optimized for deliverability
        headers: {
          'X-Entity-Ref-ID': `soundbridge-${Date.now()}`,
          'X-Mailer': 'SoundBridge Platform',
          'Precedence': 'list',
          'Importance': 'high',
          'List-Unsubscribe': '<mailto:contact@soundbridge.live?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'X-Auto-Response-Suppress': 'OOF, AutoReply'
        },
        categories: ['account-security', 'transactional', 'soundbridge']
      };

      console.log('📧 Sending plain text email:', {
        to: msg.to,
        from: msg.from.email,
        subject: msg.subject,
        textLength: msg.text.length
      });

      const result = await sgMail.send(msg);
      console.log('✅ Plain text email sent successfully');
      console.log('📧 SendGrid response status:', result[0]?.statusCode);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending plain text email:', error);
      console.error('Error message:', error?.message);
      if (error?.response) {
        console.error('SendGrid API response:', error.response.body);
      }
      return false;
    }
  }

  /**
   * Convert plain text to minimal HTML
   */
  private static textToHtml(text: string): string {
    // Convert line breaks to <br> and wrap in simple HTML
    const html = text
      .split('\n')
      .map(line => {
        // Preserve empty lines
        if (line.trim() === '') return '<br>';
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        line = line.replace(urlRegex, '<a href="$1">$1</a>');
        return line;
      })
      .join('<br>\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="white-space: pre-wrap;">${html}</div>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  <p style="font-size: 12px; color: #666;">
    SoundBridge - The LinkedIn for Music Creators<br>
    <a href="mailto:contact@soundbridge.live">contact@soundbridge.live</a>
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Generate account takedown plain text email
   */
  static generateAccountTakedownEmail(userName: string, reason: string): PlainTextEmailData {
    const subject = 'Action Required: Your SoundBridge Account';
    const text = `Hi ${userName},

We've made a change to your SoundBridge account that requires your attention.

ACCOUNT STATUS: Suspended

WHY THIS HAPPENED:
${reason}

WHAT THIS MEANS:
- Your account is temporarily suspended
- You cannot access SoundBridge at this time
- Your content is preserved and safe

WHAT YOU CAN DO:
If you believe this action was taken in error, please contact our support team. Include:
- Your account email address
- A detailed explanation of why you believe the suspension was incorrect
- Any relevant information or evidence

Contact Support:
contact@soundbridge.live

You can reply directly to this email if you have questions.

Thank you,
The SoundBridge Team

---
SoundBridge Live Ltd | soundbridge.live
This is an automated notification about your account.`;

    return {
      to: '', // Will be set by caller
      subject,
      text
    };
  }

  /**
   * Generate account restoration plain text email
   */
  static generateAccountRestorationEmail(userName: string): PlainTextEmailData {
    const subject = 'Action Required: Your SoundBridge Account';
    const text = `Hi ${userName},

Great news! We've made a change to your SoundBridge account.

ACCOUNT STATUS: Restored

Your account is now active and ready to use. You have full access to all platform features.

WHAT YOU CAN DO NOW:
- Log in to your account
- Upload and share your music
- Connect with other creators and fans
- Discover events and opportunities
- Build your professional network
- Access all platform features

Log in here:
https://www.soundbridge.live/login

IMPORTANT REMINDER:
Please ensure that your future activity on SoundBridge complies with our Terms of Service and Community Guidelines to maintain a positive experience for all users.

Questions? Reply to this email or contact us at contact@soundbridge.live

We're excited to have you back on SoundBridge!

- The SoundBridge Team

---
SoundBridge Live Ltd | soundbridge.live
This is an automated notification about your account.`;

    return {
      to: '', // Will be set by caller
      subject,
      text
    };
  }
}

