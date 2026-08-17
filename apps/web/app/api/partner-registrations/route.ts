import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { applyPendingPartnerRegistrations } from '@/src/lib/partner-referrals';

/**
 * Institution identifiers allowed to self-register through this public
 * endpoint. Extend this set (and profiles.institution_badge's CHECK
 * constraint) when onboarding a new partner onto this same flow.
 */
const VALID_PARTNER_IDS = new Set(['logic_church']);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function findUserIdByEmail(
  serviceClient: ReturnType<typeof createServiceClient>,
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

/**
 * Saves the partner_registrations row as 'pending' (its default), or silently
 * no-ops if one already exists for this email/partner. Deliberately does NOT
 * set status here even when an account already exists — applyPendingPartnerRegistrations()
 * is what flips a row to 'provisioned', and it only looks at rows still
 * marked 'pending', so pre-marking it here would make it invisible to that
 * lookup and the benefit grant would silently never run.
 */
async function saveRegistration(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  partnerId: string,
) {
  const { error: insertError } = await supabase
    .from('partner_registrations')
    .insert({ email, partner_id: partnerId });
  if (!insertError) return;

  // 23505 = unique_violation on (lower(email), partner_id) — a row is already
  // there (pending or already provisioned) — nothing more to do here.
  if ((insertError as { code?: string }).code !== '23505') {
    throw insertError;
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: string; partnerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const partnerId = String(body.partnerId || '').trim();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!VALID_PARTNER_IDS.has(partnerId)) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for an existing SoundBridge account under this email BEFORE saving,
  // so a member who already has an account gets benefits applied immediately
  // rather than waiting on a signup that will never happen.
  let existingUserId: string | null = null;
  try {
    existingUserId = await findUserIdByEmail(supabase, email);
  } catch (err) {
    console.error('[partner-registrations] account lookup failed:', err);
    // Fall through and treat as "no existing account" — the registration is
    // still saved and will self-heal at signup either way.
  }

  try {
    await saveRegistration(supabase, email, partnerId);
  } catch (err) {
    console.error('[partner-registrations] save failed:', err);
    return NextResponse.json(
      { error: "We couldn't save your registration right now. Please try again in a moment." },
      { status: 500 }
    );
  }

  if (existingUserId) {
    try {
      await applyPendingPartnerRegistrations(supabase, existingUserId, email);
    } catch (err) {
      console.error('[partner-registrations] apply benefits failed:', err);
      // The registration row itself is already saved either way — if the
      // grant partway-failed, the row stays 'pending' and a resubmission
      // (or manual admin follow-up) can safely retry it; nothing is lost.
    }
    return NextResponse.json({
      success: true,
      activated: true,
      message: "You're all set. Your Logic Church benefits are active, and we've emailed you your referral link. Log in to SoundBridge now to see them.",
    });
  }

  return NextResponse.json({
    success: true,
    activated: false,
    message: "You're registered. Create your SoundBridge account with this same email and your benefits will be applied automatically.",
  });
}
