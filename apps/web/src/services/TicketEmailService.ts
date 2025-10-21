// Ticket Email Service for SoundBridge
// Handles sending ticket confirmation, QR codes, and calendar invites

interface TicketPurchase {
  id: string;
  ticket_code: string;
  buyer_name: string;
  buyer_email: string;
  qr_code_url?: string;
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    venue?: string;
    image_url?: string;
  };
  ticket: {
    ticket_name: string;
    ticket_type: string;
  };
  amount_paid: number;
  quantity: number;
}

export class TicketEmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@soundbridge.com';
    this.fromName = 'SoundBridge Events';
  }

  /**
   * Send ticket confirmation email with QR code
   */
  async sendTicketConfirmation(purchases: TicketPurchase[]): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email API key not configured - skipping email send');
      return false;
    }

    if (purchases.length === 0) {
      return false;
    }

    const firstPurchase = purchases[0];
    const event = firstPurchase.event;
    const totalTickets = purchases.length;

    try {
      const emailHtml = this.generateConfirmationEmailHTML(purchases);
      const emailText = this.generateConfirmationEmailText(purchases);
      const calendarInvite = this.generateCalendarInvite(event);

      // Send via your email service (SendGrid, Resend, etc.)
      // This is a placeholder - integrate with your chosen service

      if (process.env.SENDGRID_API_KEY) {
        await this.sendViaSendGrid({
          to: firstPurchase.buyer_email,
          subject: `Your tickets for ${event.title}`,
          html: emailHtml,
          text: emailText,
          attachments: [
            {
              content: calendarInvite,
              filename: 'event.ics',
              type: 'text/calendar',
            }
          ],
        });
      } else if (process.env.RESEND_API_KEY) {
        await this.sendViaResend({
          to: firstPurchase.buyer_email,
          subject: `Your tickets for ${event.title}`,
          html: emailHtml,
        });
      } else {
        // Log for development
        console.log('📧 TICKET EMAIL (Development Mode)');
        console.log('To:', firstPurchase.buyer_email);
        console.log('Subject:', `Your tickets for ${event.title}`);
        console.log('Tickets:', totalTickets);
        console.log('HTML Preview (first 500 chars):', emailHtml.substring(0, 500));
      }

      return true;

    } catch (error) {
      console.error('Error sending ticket confirmation:', error);
      return false;
    }
  }

  /**
   * Send event cancellation email with refund information
   */
  async sendEventCancellationEmail({
    to,
    name,
    eventTitle,
    refundAmount,
    ticketQuantity,
    reason,
    refundStatus
  }: {
    to: string;
    name: string;
    eventTitle: string;
    refundAmount: number;
    ticketQuantity: number;
    reason: string;
    refundStatus: string;
  }): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email API key not configured - skipping cancellation email');
      return false;
    }

    try {
      const emailHtml = this.generateCancellationEmailHTML({
        name,
        eventTitle,
        refundAmount,
        ticketQuantity,
        reason,
        refundStatus
      });
      
      const emailText = this.generateCancellationEmailText({
        name,
        eventTitle,
        refundAmount,
        ticketQuantity,
        reason,
        refundStatus
      });

      if (process.env.SENDGRID_API_KEY) {
        await this.sendViaSendGrid({
          to,
          subject: `Event Cancelled: ${eventTitle}`,
          html: emailHtml,
          text: emailText,
        });
      } else if (process.env.RESEND_API_KEY) {
        await this.sendViaResend({
          to,
          subject: `Event Cancelled: ${eventTitle}`,
          html: emailHtml,
        });
      } else {
        console.log('📧 CANCELLATION EMAIL (Development Mode)');
        console.log('To:', to);
        console.log('Subject:', `Event Cancelled: ${eventTitle}`);
        console.log('Refund Amount:', refundAmount);
      }

      return true;
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      return false;
    }
  }

  /**
   * Send refund confirmation email
   */
  async sendRefundConfirmation(purchase: TicketPurchase): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email API key not configured');
      return false;
    }

    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
            .ticket-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Refund Processed</h1>
            </div>
            <div class="content">
              <p>Hi ${purchase.buyer_name},</p>
              
              <p>Your refund for the following ticket has been processed:</p>
              
              <div class="ticket-info">
                <h3>${purchase.event.title}</h3>
                <p><strong>Ticket:</strong> ${purchase.ticket.ticket_name}</p>
                <p><strong>Amount Refunded:</strong> £${purchase.amount_paid.toFixed(2)}</p>
                <p><strong>Ticket Code:</strong> ${purchase.ticket_code}</p>
              </div>
              
              <p>The refund will appear in your account within 5-10 business days.</p>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br>The SoundBridge Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log('Would send refund confirmation to:', purchase.buyer_email);
      return true;

    } catch (error) {
      console.error('Error sending refund confirmation:', error);
      return false;
    }
  }

  /**
   * Generate HTML email template
   */
  private generateConfirmationEmailHTML(purchases: TicketPurchase[]): string {
    const firstPurchase = purchases[0];
    const event = firstPurchase.event;
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount_paid, 0);

    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .event-info { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; }
          .event-info h2 { margin: 0 0 15px 0; color: #667eea; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .info-row:last-child { border-bottom: none; }
          .ticket-card { border: 2px dashed #667eea; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .qr-code { max-width: 200px; margin: 20px auto; }
          .ticket-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .total { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; font-size: 20px; margin: 20px 0; }
          .footer { text-align: center; padding: 30px; color: #666; font-size: 12px; background: #f8f9fa; }
          .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Tickets Are Confirmed!</h1>
            <p>Get ready for an amazing experience</p>
          </div>
          
          <div class="content">
            <p>Hi ${firstPurchase.buyer_name},</p>
            
            <p>Thank you for your purchase! Your tickets for <strong>${event.title}</strong> are confirmed and ready.</p>
            
            <div class="event-info">
              <h2>${event.title}</h2>
              <div class="info-row">
                <span><strong>📅 Date:</strong></span>
                <span>${formattedDate}</span>
              </div>
              <div class="info-row">
                <span><strong>🕐 Time:</strong></span>
                <span>${formattedTime}</span>
              </div>
              <div class="info-row">
                <span><strong>📍 Location:</strong></span>
                <span>${event.location}</span>
              </div>
              ${event.venue ? `
              <div class="info-row">
                <span><strong>🏛️ Venue:</strong></span>
                <span>${event.venue}</span>
              </div>
              ` : ''}
            </div>

            <div class="total">
              <div><strong>Total Tickets:</strong> ${purchases.length}</div>
              <div><strong>Total Paid:</strong> £${totalAmount.toFixed(2)}</div>
            </div>

            <h3>Your Tickets:</h3>
            
            ${purchases.map(purchase => `
              <div class="ticket-card">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                  ${purchase.ticket.ticket_name}
                </div>
                ${purchase.qr_code_url ? `
                  <div class="qr-code">
                    <img src="${purchase.qr_code_url}" alt="QR Code" style="max-width: 100%;" />
                  </div>
                ` : ''}
                <div class="ticket-code">${purchase.ticket_code}</div>
                <div style="color: #666; font-size: 12px; margin-top: 10px;">
                  Present this QR code or ticket code at the venue
                </div>
              </div>
            `).join('')}

            <div class="important">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>Please arrive at least 30 minutes before the event starts</li>
                <li>Each ticket admits one person</li>
                <li>This email serves as your ticket - keep it safe!</li>
                <li>You can present either the QR code or ticket code at entry</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="https://soundbridge.com/events/${event.id}" class="button">
                View Event Details
              </a>
            </div>

            <p>We can't wait to see you at the event!</p>
            
            <p>Best regards,<br>The SoundBridge Team</p>
          </div>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact us at support@soundbridge.com</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email
   */
  private generateConfirmationEmailText(purchases: TicketPurchase[]): string {
    const firstPurchase = purchases[0];
    const event = firstPurchase.event;
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount_paid, 0);

    return `
Your Tickets Are Confirmed!

Hi ${firstPurchase.buyer_name},

Thank you for your purchase! Your tickets for ${event.title} are confirmed.

EVENT DETAILS:
- Event: ${event.title}
- Date: ${new Date(event.event_date).toLocaleString('en-GB')}
- Location: ${event.location}
${event.venue ? `- Venue: ${event.venue}` : ''}

YOUR TICKETS:
${purchases.map((p, i) => `
Ticket ${i + 1}:
- Type: ${p.ticket.ticket_name}
- Code: ${p.ticket_code}
- Price: £${p.amount_paid.toFixed(2)}
`).join('')}

Total Tickets: ${purchases.length}
Total Paid: £${totalAmount.toFixed(2)}

IMPORTANT:
- Please arrive at least 30 minutes before the event starts
- Present your ticket code at the venue for entry
- This email serves as your ticket - keep it safe!

View full event details: https://soundbridge.com/events/${event.id}

See you at the event!

Best regards,
The SoundBridge Team

Need help? Contact us at support@soundbridge.com
    `.trim();
  }

  /**
   * Generate calendar invite (.ics file)
   */
  private generateCalendarInvite(event: any): string {
    const eventDate = new Date(event.event_date);
    const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SoundBridge//Event Ticket//EN
BEGIN:VEVENT
UID:${event.id}@soundbridge.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(eventDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:Event ticket from SoundBridge. Location: ${event.location}
LOCATION:${event.location}${event.venue ? `, ${event.venue}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Generate cancellation email HTML
   */
  private generateCancellationEmailHTML({
    name,
    eventTitle,
    refundAmount,
    ticketQuantity,
    reason,
    refundStatus
  }: {
    name: string;
    eventTitle: string;
    refundAmount: number;
    ticketQuantity: number;
    reason: string;
    refundStatus: string;
  }): string {
    const reasonText = reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const isRefunded = refundStatus === 'refunded';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Cancelled - SoundBridge</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .alert {
            background: ${isRefunded ? '#d4edda' : '#fff3cd'};
            border: 1px solid ${isRefunded ? '#c3e6cb' : '#ffeaa7'};
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .alert h3 {
            color: ${isRefunded ? '#155724' : '#856404'};
            margin-top: 0;
          }
          .event-info {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #dc2626;
          }
          .refund-details {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .refund-details table {
            width: 100%;
            border-collapse: collapse;
          }
          .refund-details td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .refund-details td:first-child {
            font-weight: bold;
            width: 40%;
          }
          .button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">🎫 Event Cancelled</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Automatic refund processed</p>
        </div>
        
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>We're sorry to inform you that the following event has been cancelled:</p>
          
          <div class="event-info">
            <h2 style="margin-top: 0; color: #dc2626;">${eventTitle}</h2>
            <p><strong>Reason for cancellation:</strong> ${reasonText}</p>
            <p><strong>Tickets purchased:</strong> ${ticketQuantity}</p>
          </div>
          
          <div class="alert">
            <h3>💰 ${isRefunded ? 'Refund Processed' : 'Refund Processing'}</h3>
            <div class="refund-details">
              <table>
                <tr>
                  <td>Refund Amount:</td>
                  <td><strong>£${refundAmount.toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td>Processing Time:</td>
                  <td>3-5 business days</td>
                </tr>
                <tr>
                  <td>Refund Method:</td>
                  <td>Original payment method</td>
                </tr>
                <tr>
                  <td>Status:</td>
                  <td><strong style="color: ${isRefunded ? '#155724' : '#856404'};">${isRefunded ? 'Completed' : 'Processing'}</strong></td>
                </tr>
              </table>
            </div>
          </div>
          
          <p>
            ${isRefunded 
              ? 'Your refund has been processed successfully and will appear in your original payment method within 3-5 business days.'
              : 'Your refund is being processed and will be returned to your original payment method within 3-5 business days.'
            }
          </p>
          
          <p><strong>No action is required on your part.</strong></p>
          
          <p>We understand this is disappointing, and we apologize for any inconvenience. We hope to welcome you at future SoundBridge events!</p>
          
          <div style="text-align: center;">
            <a href="https://soundbridge.com/events" class="button">Browse Other Events</a>
          </div>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>If you have any questions about your refund, please contact our support team at support@soundbridge.com</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} SoundBridge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate cancellation email plain text
   */
  private generateCancellationEmailText({
    name,
    eventTitle,
    refundAmount,
    ticketQuantity,
    reason,
    refundStatus
  }: {
    name: string;
    eventTitle: string;
    refundAmount: number;
    ticketQuantity: number;
    reason: string;
    refundStatus: string;
  }): string {
    const reasonText = reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const isRefunded = refundStatus === 'refunded';

    return `
EVENT CANCELLED - AUTOMATIC REFUND ${isRefunded ? 'PROCESSED' : 'PROCESSING'}

Dear ${name},

We're sorry to inform you that the following event has been cancelled:

EVENT: ${eventTitle}
REASON: ${reasonText}
TICKETS PURCHASED: ${ticketQuantity}

REFUND DETAILS:
- Amount: £${refundAmount.toFixed(2)}
- Processing Time: 3-5 business days
- Refund Method: Original payment method
- Status: ${isRefunded ? 'Completed' : 'Processing'}

${isRefunded 
  ? 'Your refund has been processed successfully and will appear in your original payment method within 3-5 business days.'
  : 'Your refund is being processed and will be returned to your original payment method within 3-5 business days.'
}

No action is required on your part.

We understand this is disappointing, and we apologize for any inconvenience. We hope to welcome you at future SoundBridge events!

Browse other events: https://soundbridge.com/events

Need help? Contact us at support@soundbridge.com

© ${new Date().getFullYear()} SoundBridge. All rights reserved.
    `.trim();
  }

  private async sendViaSendGrid(params: any): Promise<void> {
    const sendGridData = {
      from: { 
        email: process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live', 
        name: process.env.SENDGRID_FROM_NAME || 'SoundBridge Events' 
      },
      personalizations: [{
        to: [{ email: params.to }],
        subject: params.subject
      }],
      content: [
        {
          type: 'text/html',
          value: params.html
        },
        {
          type: 'text/plain', 
          value: params.text
        }
      ],
      attachments: params.attachments || []
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API failed:', response.status, errorText);
      throw new Error(`SendGrid API failed: ${response.status}`);
    }

    console.log('Ticket email sent successfully via SendGrid');
  }

  private async sendViaResend(params: any): Promise<void> {
    // Implement Resend integration if needed
    console.log('Resend email would be sent:', params);
  }
}

export const ticketEmailService = new TicketEmailService();

