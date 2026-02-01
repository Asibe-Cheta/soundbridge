import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { SendGridService } from '@/src/lib/sendgrid-service';

const SENDGRID_WAITLIST_TEMPLATE_ID = process.env.SENDGRID_WAITLIST_TEMPLATE_ID;
const CONTACT_EMAIL = 'contact@soundbridge.live';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Waitlist signup API called');
    
    const body = await request.json();
    const { email, role, location, country, state, city, genres, referral_source } = body;

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
        location: location || null, // Legacy field - stores JSON string if provided
        country: country || null,
        state: state || null,
        city: city || null,
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
    if (SENDGRID_WAITLIST_TEMPLATE_ID) {
      try {
        const emailSent = await SendGridService.sendTemplatedEmail({
          to: email.toLowerCase().trim(),
          from: CONTACT_EMAIL,
          fromName: 'SoundBridge Team',
          replyTo: CONTACT_EMAIL,
          templateId: SENDGRID_WAITLIST_TEMPLATE_ID,
          subject: 'Welcome to SoundBridge Waitlist! 🎵',
          dynamicTemplateData: {
            subject: 'Welcome to SoundBridge Waitlist! 🎵',
            name: email.split('@')[0], // Basic name from email
            waitlist_link: 'https://soundbridge.live/waitlist',
            social_media_link: 'https://twitter.com/soundbridge', // Update with actual social link
            founder_name: 'Justice Asibe',
            contact_email: CONTACT_EMAIL,
          },
          categories: ['waitlist', 'transactional', 'soundbridge'],
        });

        if (!emailSent) {
          console.error('❌ Failed to send waitlist confirmation email via SendGrid');
          // Don't fail the request if email fails - signup is still successful
        } else {
          console.log('✅ Confirmation email sent successfully via SendGrid template');
        }
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
        // Don't fail the request if email fails - signup is still successful
      }
    } else {
      console.warn('⚠️ SENDGRID_WAITLIST_TEMPLATE_ID not set. Skipping confirmation email.');
      console.log('💡 To enable waitlist confirmation emails, create a SendGrid template and set SENDGRID_WAITLIST_TEMPLATE_ID in your environment variables.');
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

