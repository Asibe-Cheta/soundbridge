import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { applyPendingPartnerRegistrations } from '@/src/lib/partner-referrals';

/**
 * Self-healing safety net for partner benefits, called from AuthContext on
 * every session load (same idea as ensureInstitutionalPremiumAccess for the
 * ?source= cookie flow, but this covers the email-match partner_registrations
 * flow, which has no client-side equivalent because partner_registrations and
 * partners have no RLS policies for the browser's anon-key client — service
 * role only. Runs server-side here instead.
 *
 * Two repairs, both best-effort / non-fatal:
 *  1. Picks up any partner_registrations row still 'pending' for this email
 *     (covers the case where immediate provisioning at registration-submit
 *     time silently failed partway through).
 *  2. Re-asserts grant_institutional_access if institutional_access shows an
 *     active grant but profiles.subscription_tier/status has drifted away
 *     from it — covers Sound Academy / Abbey Road too, not just
 *     email-registration partners, in case something else (e.g. a real
 *     subscription sync) overwrote the profile fields afterward.
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let changed = false;

  try {
    const { data: pendingBefore } = await supabase
      .from('partner_registrations')
      .select('id')
      .ilike('email', String(user.email || ''))
      .eq('status', 'pending');
    if (pendingBefore && pendingBefore.length > 0) {
      await applyPendingPartnerRegistrations(supabase, user.id, user.email);
      changed = true;
    }

    const { data: grants } = await supabase
      .from('institutional_access')
      .select('institution')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (grants && grants.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      const needsReassert =
        !profile ||
        !['premium', 'unlimited'].includes(String(profile.subscription_tier)) ||
        profile.subscription_status !== 'active';

      if (needsReassert) {
        for (const grant of grants) {
          const { error } = await supabase.rpc('grant_institutional_access', {
            p_user_id: user.id,
            p_institution: grant.institution,
            p_access_tier: 'premium',
          });
          if (error) {
            console.error('[ensure-partner-benefits] re-assert grant_institutional_access failed:', error.message);
          } else {
            changed = true;
          }
        }
      }
    }
  } catch (err) {
    console.error('[ensure-partner-benefits] failed:', err);
    // Best-effort self-heal — never surface this as an error to the client.
  }

  return NextResponse.json({ success: true, changed });
}
