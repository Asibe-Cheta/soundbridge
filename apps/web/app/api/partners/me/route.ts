import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (partnerError) {
    return NextResponse.json({ error: partnerError.message }, { status: 500 });
  }

  if (!partner) {
    return NextResponse.json({ partner: null, referrals: [] });
  }

  const { data: referrals, error: referralsError } = await supabase
    .from('referral_signups')
    .select('id, signed_up_at, converted_to_paid, converted_at, subscription_tier, commission_amount, commission_paid')
    .eq('partner_id', partner.id)
    .order('signed_up_at', { ascending: false });

  if (referralsError) {
    return NextResponse.json({ error: referralsError.message }, { status: 500 });
  }

  const pendingCommission = (referrals || [])
    .filter((row: any) => !row.commission_paid)
    .reduce((sum: number, row: any) => sum + Number(row.commission_amount || 0), 0);

  return NextResponse.json({
    partner: {
      ...partner,
      pending_commission: pendingCommission,
    },
    referrals: referrals || [],
  });
}
