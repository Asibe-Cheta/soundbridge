import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const CONTACT_EMAIL = 'contact@soundbridge.live';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Waitlist signup API called');
    
    const body = await request.json();
    const { email, role, location, genres, referral_source } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    console.log('📧 Waitlist signup:', { email, role, location });

    // Create Supabase service client
    const supabase = createServiceClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { 
          success: true,
          message: "You're already on the waitlist! We'll notify you when we launch.",
          already_exists: true
        },
        { status: 200 }
      );
    }

    // Insert into waitlist table
    const { data: waitlistEntry, error: dbError } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        role: role || null,
        location: location || null,
        genres: genres || null,
        referral_source: referral_source || null,
        confirmed: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save signup. Please try again later.' },
        { status: 500 }
      );
    }

    // Send confirmation email via SendGrid
    try {
      const emailContent = {
        personalizations: [
          {
            to: [{ email: email.toLowerCase().trim() }]
          }
        ],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || CONTACT_EMAIL,
          name: 'SoundBridge Team'
        },
        subject: 'Welcome to SoundBridge Waitlist! 🎵',
        content: [
          {
            type: 'text/plain',
            value: `Hi there!

Thanks for joining the SoundBridge waitlist! You're now part of an exclusive group of artists, producers, and music professionals who will get early access.

Here's what happens next:
✅ We'll email you with exclusive updates as we build
✅ You'll be first to know when we launch (Q2 2026)
✅ Early access to all features before public release

In the meantime:
- Follow our journey on social media
- Have questions? Reply to this email
- Know other artists? Share: soundbridge.live/waitlist

Building the future of music together 🚀

Justice Asibe
Founder, SoundBridge
${CONTACT_EMAIL}`
          },
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h2 style="color: #8B5CF6; border-bottom: 2px solid #8B5CF6; padding-bottom: 10px; margin-top: 0;">
                    Welcome to SoundBridge Waitlist! 🎵
                  </h2>
                  
                  <p style="color: #333; font-size: 16px; line-height: 1.6;">
                    Hi there!
                  </p>
                  
                  <p style="color: #333; font-size: 16px; line-height: 1.6;">
                    Thanks for joining the SoundBridge waitlist! You're now part of an exclusive group of artists, producers, and music professionals who will get early access.
                  </p>
                  
                  <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Here's what happens next:</h3>
                    <ul style="color: #333; font-size: 16px; line-height: 1.8;">
                      <li>✅ We'll email you with exclusive updates as we build</li>
                      <li>✅ You'll be first to know when we launch (Q2 2026)</li>
                      <li>✅ Early access to all features before public release</li>
                    </ul>
                  </div>
                  
                  <div style="margin: 20px 0;">
                    <h3 style="color: #333;">In the meantime:</h3>
                    <ul style="color: #333; font-size: 16px; line-height: 1.8;">
                      <li>Follow our journey on social media</li>
                      <li>Have questions? Reply to this email</li>
                      <li>Know other artists? Share: <a href="https://soundbridge.live/waitlist" style="color: #8B5CF6;">soundbridge.live/waitlist</a></li>
                    </ul>
                  </div>
                  
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                    Building the future of music together 🚀
                  </p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
                    <p style="margin: 5px 0;"><strong>Justice Asibe</strong></p>
                    <p style="margin: 5px 0;">Founder, SoundBridge</p>
                    <p style="margin: 5px 0;"><a href="mailto:${CONTACT_EMAIL}" style="color: #8B5CF6;">${CONTACT_EMAIL}</a></p>
                  </div>
                </div>
              </div>
            `
          }
        ]
      };

      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailContent)
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('❌ SendGrid API failed:', emailResponse.status, errorText);
        // Don't fail the request if email fails - signup is still successful
      } else {
        console.log('✅ Confirmation email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
      // Don't fail the request if email fails - signup is still successful
    }

    console.log('✅ Waitlist signup successful');
    return NextResponse.json({
      success: true,
      message: "🎉 You're on the list! Check your email for confirmation.",
      data: waitlistEntry
    });

  } catch (error) {
    console.error('❌ Waitlist signup error:', error);
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
    message: 'Waitlist API is running',
    timestamp: new Date().toISOString()
  });
}

