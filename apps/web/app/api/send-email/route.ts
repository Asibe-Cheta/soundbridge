// SendGrid Email Sending API
// POST /api/send-email
// Sends emails via SendGrid

import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { to, subject, html, text } = body;

    // Validate inputs
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and (html or text)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Send email via SendGrid
    const message = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@soundbridge.live',
        name: 'SoundBridge'
      },
      subject,
      html: html || undefined,
      text: text || undefined
    };

    console.log(`📧 Sending email to ${to}: ${subject}`);

    await sgMail.send(message);

    console.log(`✅ Email sent successfully to ${to}`);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error: any) {
    console.error('SendGrid error:', error);

    // Handle SendGrid-specific errors
    if (error.response) {
      console.error('SendGrid response error:', error.response.body);
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: error.response.body?.errors || 'Unknown SendGrid error'
        },
        { status: error.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while sending email' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
