import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { SubscriptionEmailService } from '@/src/services/SubscriptionEmailService';

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (
    request.headers.get('authorization') === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get('secret') === secret ||
    request.headers.get('x-vercel-cron-secret') === secret
  );
}

async function sendExpiryWarning(email: string | null | undefined, expiresAt: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || !email) return;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live',
        name: process.env.SENDGRID_FROM_NAME || 'SoundBridge Team',
      },
      personalizations: [{ to: [{ email }] }],
      subject: 'Your Sound Academy Premium access expires soon',
      content: [
        {
          type: 'text/plain',
          value: `Your Sound Academy Premium access expires on ${new Date(expiresAt).toLocaleDateString('en-GB')}. To continue enjoying Premium features, subscribe at £6.99/month.`,
        },
      ],
    }),
  }).catch((error) => console.error('[institutional-access-expiry] warning email failed:', error));
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const warningStart = new Date(now);
  warningStart.setDate(warningStart.getDate() + 29);
  const warningEnd = new Date(now);
  warningEnd.setDate(warningEnd.getDate() + 31);

  const { data: expiringRows } = await supabase
    .from('institutional_access')
    .select('user_id, expires_at')
    .eq('is_active', true)
    .gte('expires_at', warningStart.toISOString())
    .lte('expires_at', warningEnd.toISOString());

  for (const row of expiringRows || []) {
    const userInfo = await SubscriptionEmailService.getUserInfo(row.user_id);
    await sendExpiryWarning(userInfo?.email, row.expires_at);
  }

  const { data: expiredRows } = await supabase
    .from('institutional_access')
    .select('user_id')
    .eq('is_active', true)
    .lt('expires_at', now.toISOString());

  const expiredUserIds = (expiredRows || []).map((row: any) => row.user_id);
  if (expiredUserIds.length) {
    const { data: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .in('user_id', expiredUserIds)
      .in('status', ['active', 'trialing']);
    const usersWithActiveSubscriptions = new Set((activeSubscriptions || []).map((row: any) => row.user_id));
    const downgradeUserIds = expiredUserIds.filter((userId: string) => !usersWithActiveSubscriptions.has(userId));

    await supabase
      .from('institutional_access')
      .update({ is_active: false })
      .in('user_id', expiredUserIds);

    if (downgradeUserIds.length) {
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_updated_at: now.toISOString(),
        })
        .in('id', downgradeUserIds);
    }
  }

  return NextResponse.json({
    warnings_sent: expiringRows?.length || 0,
    expired_processed: expiredUserIds.length,
  });
}
