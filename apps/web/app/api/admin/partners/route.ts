import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data: partners, error } = await admin.serviceClient
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((partners || []).map((partner: any) => partner.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await admin.serviceClient
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds)
    : { data: [] };

  const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return NextResponse.json({
    partners: (partners || []).map((partner: any) => ({
      ...partner,
      profile: profileById.get(partner.user_id) || null,
      pending_commission: Number(partner.total_commission_earned || 0),
    })),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  const userId = String(body.userId || '').trim();
  const referralCode = String(body.referralCode || '').trim().toLowerCase();
  const commissionRate = Number(body.commissionRate || 0.1);

  if (!userId || !referralCode) {
    return NextResponse.json({ error: 'userId and referralCode are required' }, { status: 400 });
  }

  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.live'}/join?ref=${encodeURIComponent(referralCode)}`;
  const { data, error } = await admin.serviceClient
    .from('partners')
    .insert({
      user_id: userId,
      referral_code: referralCode,
      referral_link: referralLink,
      commission_rate: commissionRate,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ partner: data }, { status: 201 });
}
