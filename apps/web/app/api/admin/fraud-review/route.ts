/**
 * GET /api/admin/fraud-review — summary, flagged, monitor lists
 * GET /api/admin/fraud-review?id=uuid — play detail panel
 * POST /api/admin/fraud-review — approve | withhold | ban
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import {
  getPlayDetailForAnalysis,
  runManualHighPlayAnalysis,
  runPlaycountFraudAnalysisJob,
} from '@/src/lib/playcount-fraud-analysis-job';
import {
  sendFraudAccountBannedEmail,
  sendFraudPayoutWithheldEmail,
} from '@/src/lib/fraud-review-emails';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const { searchParams } = new URL(request.url);
  const detailId = searchParams.get('id');
  const runAnalysis = searchParams.get('run') === '1';
  const manualTop = searchParams.get('manualTop');

  if (detailId) {
    const detail = await getPlayDetailForAnalysis(service, detailId);
    return NextResponse.json(detail, { headers: CORS });
  }

  if (runAnalysis) {
    const result = await runPlaycountFraudAnalysisJob(service);
    return NextResponse.json({ success: true, result }, { headers: CORS });
  }

  if (manualTop) {
    const manual = await runManualHighPlayAnalysis(service, parseInt(manualTop, 10) || 10);
    return NextResponse.json({ manual }, { headers: CORS });
  }

  const monthStart = startOfMonthIso().slice(0, 10);

  const [
    flaggedRes,
    monitorRes,
    flaggedMonthRes,
    holdRes,
    suspiciousMonthRes,
    manualSnapshot,
  ] = await Promise.all([
    service
      .from('creator_fraud_analysis')
      .select(
        'id, creator_id, track_id, analysis_date, total_plays, unique_listeners, play_to_listener_ratio, platform_ratio, fraud_score, fraud_status, payout_held, reviewed_by_admin, admin_decision, created_at, profiles:creator_id(username, display_name), audio_tracks:track_id(title)',
      )
      .in('fraud_status', ['flagged', 'hold'])
      .order('fraud_score', { ascending: false })
      .limit(100),
    service
      .from('creator_fraud_analysis')
      .select(
        'id, creator_id, track_id, analysis_date, total_plays, unique_listeners, play_to_listener_ratio, platform_ratio, fraud_score, fraud_status, created_at, profiles:creator_id(username, display_name), audio_tracks:track_id(title)',
      )
      .eq('fraud_status', 'monitor')
      .order('fraud_score', { ascending: false })
      .limit(100),
    service
      .from('creator_fraud_analysis')
      .select('*', { count: 'exact', head: true })
      .in('fraud_status', ['flagged', 'hold'])
      .gte('analysis_date', monthStart),
    service
      .from('creator_fraud_analysis')
      .select('*', { count: 'exact', head: true })
      .eq('payout_held', true)
      .eq('reviewed_by_admin', false),
    service
      .from('play_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspicious', true)
      .gte('played_at', startOfMonthIso()),
    runManualHighPlayAnalysis(service, 10),
  ]);

  return NextResponse.json(
    {
      summary: {
        accounts_flagged_this_month: flaggedMonthRes.count ?? 0,
        payouts_on_hold: holdRes.count ?? 0,
        suspicious_plays_this_month: suspiciousMonthRes.count ?? 0,
      },
      flagged: flaggedRes.data ?? [],
      monitor: monitorRes.data ?? [],
      high_play_manual_analysis: manualSnapshot,
    },
    { headers: CORS },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const body = await request.json().catch(() => ({}));
  const { analysisId, action } = body as { analysisId?: string; action?: string };

  if (!analysisId || !action) {
    return NextResponse.json({ error: 'analysisId and action required' }, { status: 400, headers: CORS });
  }

  const { data: row, error: fetchError } = await service
    .from('creator_fraud_analysis')
    .select('*, profiles:creator_id(username, display_name)')
    .eq('id', analysisId)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Analysis row not found' }, { status: 404, headers: CORS });
  }

  const creatorId = row.creator_id as string;
  const profile = row.profiles as { username?: string; display_name?: string } | null;
  const creatorName = profile?.display_name || profile?.username || 'Creator';

  const { data: authUser } = await service.auth.admin.getUserById(creatorId);
  const creatorEmail = authUser?.user?.email;

  const now = new Date().toISOString();

  if (action === 'approve') {
    const { error } = await service
      .from('creator_fraud_analysis')
      .update({
        reviewed_by_admin: true,
        admin_decision: 'approved',
        fraud_status: 'clean',
        payout_held: false,
        reviewed_at: now,
      })
      .eq('id', analysisId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true, action: 'approved' }, { headers: CORS });
  }

  if (action === 'withhold') {
    const { error } = await service
      .from('creator_fraud_analysis')
      .update({
        reviewed_by_admin: true,
        admin_decision: 'withheld',
        payout_held: true,
        reviewed_at: now,
      })
      .eq('id', analysisId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    if (creatorEmail) {
      await sendFraudPayoutWithheldEmail(creatorEmail, creatorName);
    }

    return NextResponse.json({ success: true, action: 'withheld', emailSent: Boolean(creatorEmail) }, { headers: CORS });
  }

  if (action === 'ban') {
    const { error: analysisError } = await service
      .from('creator_fraud_analysis')
      .update({
        reviewed_by_admin: true,
        admin_decision: 'banned',
        payout_held: true,
        fraud_status: 'hold',
        reviewed_at: now,
      })
      .eq('id', analysisId);

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500, headers: CORS });
    }

    await service
      .from('profiles')
      .update({
        banned: true,
        banned_at: now,
        ban_reason: 'Play count integrity violation',
        is_active: false,
      })
      .eq('id', creatorId);

    if (creatorEmail) {
      await sendFraudAccountBannedEmail(creatorEmail, creatorName);
    }

    return NextResponse.json({ success: true, action: 'banned', emailSent: Boolean(creatorEmail) }, { headers: CORS });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
