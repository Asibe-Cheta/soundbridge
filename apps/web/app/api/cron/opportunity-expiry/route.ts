// Vercel Cron Job: Opportunity Expiry Notifications (Section 8g)
// Runs daily to notify posters of opportunities expiring in 7 days
// Endpoint: /api/cron/opportunity-expiry

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Opportunity expiry notifications cron started');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: opportunities, error: oppError } = await supabase
      .from('opportunity_posts')
      .select('id, user_id, title, interest_count')
      .eq('is_active', true)
      .not('expires_at', 'is', null)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', sevenDaysFromNow.toISOString());

    if (oppError) {
      console.error('❌ Failed to fetch expiring opportunities:', oppError);
      return NextResponse.json({ success: false, error: oppError.message }, { status: 500 });
    }

    if (!opportunities?.length) {
      console.log('✅ No opportunities expiring in 7 days');
      return NextResponse.json({ success: true, notified: 0 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('related_id')
      .in('type', ['opportunity_expiring_no_interest', 'opportunity_expiring_with_interest'])
      .eq('related_type', 'opportunity')
      .gte('created_at', sevenDaysAgo.toISOString());

    const alreadyNotified = new Set(
      (existingNotifications || []).map((n) => (n as { related_id: string }).related_id)
    );

    let notified = 0;
    for (const opp of opportunities) {
      if (alreadyNotified.has(opp.id)) continue;

      const interestCount = opp.interest_count ?? 0;
      const isNoInterest = interestCount === 0;

      const { error: insertErr } = await supabase.from('notifications').insert({
        user_id: opp.user_id,
        type: isNoInterest ? 'opportunity_expiring_no_interest' : 'opportunity_expiring_with_interest',
        title: isNoInterest
          ? 'Your opportunity expires soon'
          : `${interestCount} creator(s) are interested — act soon`,
        body: isNoInterest
          ? `No one has expressed interest in '${opp.title}' yet. Try expanding your location or adjusting your budget.`
          : `'${opp.title}' expires in 7 days. Review interests and choose a creator.`,
        related_id: opp.id,
        related_type: 'opportunity',
        metadata: {
          opportunity_id: opp.id,
          type: isNoInterest ? 'opportunity_expiring_no_interest' : 'opportunity_expiring_with_interest',
        },
      });

      if (insertErr) {
        console.error(`Failed to notify for opportunity ${opp.id}:`, insertErr);
      } else {
        notified++;
      }
    }

    console.log(`✅ Opportunity expiry notifications completed: ${notified} notified`);

    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error('❌ Opportunity expiry cron failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
