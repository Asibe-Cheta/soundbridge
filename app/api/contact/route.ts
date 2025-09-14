import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const CONTACT_EMAIL = 'contact@soundbridge.live';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Contact form API called');
    
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('📧 Contact form submission:', { name, email, subject });

    // Create email content using SendGrid v3 API format
    const emailContent = {
      personalizations: [
        {
          to: [{ email: CONTACT_EMAIL }],
          reply_to: { email: email, name: name }
        }
      ],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@soundbridge.live',
        name: 'SoundBridge Contact Form'
      },
      subject: `Contact Form: ${subject}`,
      content: [
        {
          type: 'text/plain',
          value: `
New contact form submission from SoundBridge website:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the SoundBridge contact form.
          `
        },
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">
                New Contact Form Submission
              </h2>
              
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Subject:</strong> ${subject}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #333;">Message:</h3>
                <div style="background-color: white; padding: 15px; border-left: 4px solid #DC2626; border-radius: 4px;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                <p>This message was sent from the SoundBridge contact form at ${new Date().toLocaleString()}.</p>
                <p>You can reply directly to this email to respond to ${name}.</p>
              </div>
            </div>
          `
        }
      ]
    };

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailContent)
    });

    if (response.ok) {
      console.log('✅ Contact form email sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Your message has been sent successfully! We will get back to you soon.'
      });
    } else {
      const errorText = await response.text();
      console.error('❌ SendGrid API failed:', response.status, errorText);
      return NextResponse.json({
        error: 'Failed to send message. Please try again later.',
        details: errorText
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Contact form API is running',
    timestamp: new Date().toISOString()
  });
}
