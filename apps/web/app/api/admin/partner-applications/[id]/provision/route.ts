import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

const REFERRAL_INSTITUTION = 'referral_partner';

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

async function findUserIdByEmail(
  serviceClient: ReturnType<typeof import('@/src/lib/supabase').createServiceClient>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function generateUniqueReferralCode(
  serviceClient: ReturnType<typeof import('@/src/lib/supabase').createServiceClient>,
  fullName: string,
  email: string
): Promise<string> {
  const base = slugify(fullName) || slugify(email.split('@')[0]) || 'partner';
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    const { data } = await serviceClient
      .from('partners')
      .select('id')
      .eq('referral_code', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const { serviceClient } = admin;

  const { data: application, error: fetchError } = await serviceClient
    .from('partner_agreement_signups')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.status === 'provisioned') {
    return NextResponse.json({ error: 'This application has already been provisioned.' }, { status: 409 });
  }

  const userId = await findUserIdByEmail(serviceClient, application.email);
  if (!userId) {
    return NextResponse.json(
      {
        error: `No SoundBridge account found for ${application.email} yet. Ask them to sign up first, then provision again.`,
      },
      { status: 422 }
    );
  }

  const { data: existingPartner } = await serviceClient
    .from('partners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let partner = existingPartner;

  if (!partner) {
    const referralCode = await generateUniqueReferralCode(serviceClient, application.full_name, application.email);
    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.live'}/join?ref=${encodeURIComponent(referralCode)}`;

    const { data: created, error: createError } = await serviceClient
      .from('partners')
      .insert({
        user_id: userId,
        referral_code: referralCode,
        referral_link: referralLink,
        commission_rate: 0.1,
      })
      .select('*')
      .single();

    if (createError || !created) {
      console.error('[partner-applications/provision] create partner', createError);
      return NextResponse.json({ error: 'Could not create partner record' }, { status: 500 });
    }
    partner = created;
  }

  const { error: grantError } = await serviceClient.rpc('grant_institutional_access', {
    p_user_id: userId,
    p_institution: REFERRAL_INSTITUTION,
    p_access_tier: 'premium',
  });

  if (grantError) {
    console.error('[partner-applications/provision] grant premium', grantError);
    return NextResponse.json({ error: 'Partner record created, but granting Premium access failed. Retry from the Institutional Access tools.' }, { status: 500 });
  }

  const { error: updateError } = await serviceClient
    .from('partner_agreement_signups')
    .update({
      status: 'provisioned',
      provisioned_partner_id: partner.id,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[partner-applications/provision] update signup', updateError);
  }

  return NextResponse.json({ success: true, partner });
}
