import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { data: listData, error: listError } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: `email.eq.${email}`,
    });

    if (listError) {
      console.error('[partner-qr-lookup] auth listUsers failed:', listError.message);
      return NextResponse.json(
        { success: false, error: 'Could not verify partner account.' },
        { status: 500 },
      );
    }

    const authUser = listData?.users?.[0];
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'No SoundBridge account found for this email.' },
        { status: 404 },
      );
    }

    const { data: partner, error: partnerError } = await service
      .from('partners')
      .select('referral_code, referral_link')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (partnerError) {
      console.error('[partner-qr-lookup] partners query failed:', partnerError.message);
      return NextResponse.json(
        { success: false, error: 'Could not verify partner account.' },
        { status: 500 },
      );
    }

    if (!partner?.referral_code) {
      return NextResponse.json(
        {
          success: false,
          error: 'This email is not registered as a SoundBridge partner.',
        },
        { status: 404 },
      );
    }

    const { data: profile } = await service
      .from('profiles')
      .select('display_name, username')
      .eq('id', authUser.id)
      .maybeSingle();

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://soundbridge.live';

    const referralCode = partner.referral_code.toLowerCase();
    const qrUrl =
      partner.referral_link ||
      `${siteOrigin}/join?ref=${encodeURIComponent(referralCode)}`;

    return NextResponse.json({
      success: true,
      data: {
        displayName:
          profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          referralCode,
        referralCode,
        qrUrl,
      },
    });
  } catch (error: unknown) {
    console.error('[partner-qr-lookup] unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
