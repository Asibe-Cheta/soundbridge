/**
 * GET /api/admin/fraud-review — summary, flagged, monitor, suspicious tracks
 * GET /api/admin/fraud-review?id=uuid — play detail
 * GET /api/admin/fraud-review?emailDraft=1&analysisId=uuid — email composer draft
 * POST /api/admin/fraud-review — approve | withhold | ban | send_warning_email
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { getSuspiciousTrackCreators } from '@/src/lib/fraud-detection-query';
import {
  getPlayDetailForAnalysis,
  runManualHighPlayAnalysis,
  runPlaycountFraudAnalysisJob,
} from '@/src/lib/playcount-fraud-analysis-job';
import {
  fraudEmailTemplateForStatus,
  sendCustomFraudReviewEmail,
  sendFraudAccountBannedEmail,
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

async function loadAnalysisRow(service: SupabaseClient, analysisId: string) {
  const { data: row, error } = await service
    .from('creator_fraud_analysis')
    .select('*, profiles:creator_id(username, display_name), audio_tracks:track_id(title, play_count)')
    .eq('id', analysisId)
    .single();
  return { row, error };
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
  const emailDraft = searchParams.get('emailDraft') === '1';
  const analysisId = searchParams.get('analysisId');
  const trackId = searchParams.get('trackId');
  const creatorId = searchParams.get('creatorId');

  if (emailDraft && (analysisId || (trackId && creatorId))) {
    let fraudStatus: string | null = null;
    let creatorName = 'Creator';
    let trackTitle = 'your track';
    let playCount = 0;
    let toEmail: string | null = null;
    let resolvedAnalysisId: string | null = analysisId;

    if (analysisId) {
      const { row, error } = await loadAnalysisRow(service, analysisId);
      if (error || !row) {
        return NextResponse.json({ error: 'Analysis row not found' }, { status: 404, headers: CORS });
      }
      fraudStatus = row.fraud_status;
      const profile = row.profiles as { username?: string; display_name?: string } | null;
      const track = row.audio_tracks as { title?: string; play_count?: number } | null;
      creatorName = profile?.display_name || profile?.username || creatorName;
      trackTitle = track?.title ?? trackTitle;
      playCount = Number(track?.play_count ?? row.total_plays ?? 0);
      const { data: authUser } = await service.auth.admin.getUserById(row.creator_id);
      toEmail = authUser?.user?.email ?? null;
    } else if (trackId && creatorId) {
      const [{ data: profile }, { data: track }, { data: authUser }, { data: analysis }] = await Promise.all([
        service.from('profiles').select('username, display_name').eq('id', creatorId).maybeSingle(),
        service.from('audio_tracks').select('title, play_count').eq('id', trackId).maybeSingle(),
        service.auth.admin.getUserById(creatorId),
        service
          .from('creator_fraud_analysis')
          .select('id, fraud_status')
          .eq('track_id', trackId)
          .order('analysis_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      creatorName = profile?.display_name || profile?.username || creatorName;
      trackTitle = track?.title ?? trackTitle;
      playCount = Number(track?.play_count ?? 0);
      toEmail = authUser?.user?.email ?? null;
      fraudStatus = analysis?.fraud_status ?? (playCount >= 500 ? 'hold' : 'flagged');
      resolvedAnalysisId = analysis?.id ?? null;
    }

    const template = fraudEmailTemplateForStatus(fraudStatus, {
      creatorName,
      trackTitle,
      playCount,
    });

    return NextResponse.json(
      {
        analysisId: resolvedAnalysisId,
        to: toEmail,
        creatorName,
        trackTitle,
        playCount,
        fraudStatus,
        ...template,
      },
      { headers: CORS },
    );
  }

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
    suspiciousTracks,
  ] = await Promise.all([
    service
      .from('creator_fraud_analysis')
      .select(
        'id, creator_id, track_id, analysis_date, total_plays, unique_listeners, play_to_listener_ratio, platform_ratio, fraud_score, fraud_status, payout_held, reviewed_by_admin, admin_decision, warning_email_sent, warning_email_sent_at, created_at, profiles:creator_id(username, display_name), audio_tracks:track_id(title, play_count)',
      )
      .in('fraud_status', ['flagged', 'hold'])
      .order('fraud_score', { ascending: false })
      .limit(100),
    service
      .from('creator_fraud_analysis')
      .select(
        'id, creator_id, track_id, analysis_date, total_plays, unique_listeners, play_to_listener_ratio, platform_ratio, fraud_score, fraud_status, warning_email_sent, warning_email_sent_at, created_at, profiles:creator_id(username, display_name), audio_tracks:track_id(title, play_count)',
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
    getSuspiciousTrackCreators(service),
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
      suspicious_tracks: suspiciousTracks,
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
  const { analysisId, action, to, subject, text, trackId, creatorId } = body as {
    analysisId?: string;
    action?: string;
    to?: string;
    subject?: string;
    text?: string;
    trackId?: string;
    creatorId?: string;
  };

  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400, headers: CORS });
  }

  if (action === 'send_warning_email') {
    if (!to?.trim() || !subject?.trim() || !text?.trim()) {
      return NextResponse.json({ error: 'to, subject, and text are required' }, { status: 400, headers: CORS });
    }

    const sent = await sendCustomFraudReviewEmail({
      to: to.trim(),
      subject: subject.trim(),
      text: text.trim(),
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email (check SendGrid config)' }, { status: 500, headers: CORS });
    }

    const now = new Date().toISOString();
    let targetAnalysisId = analysisId ?? null;

    if (!targetAnalysisId && trackId) {
      const { data: existing } = await service
        .from('creator_fraud_analysis')
        .select('id')
        .eq('track_id', trackId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      targetAnalysisId = existing?.id ?? null;
    }

    if (targetAnalysisId) {
      await service
        .from('creator_fraud_analysis')
        .update({
          warning_email_sent: true,
          warning_email_sent_at: now,
        })
        .eq('id', targetAnalysisId);
    }

    return NextResponse.json({ success: true, action: 'send_warning_email', emailSent: true, analysisId: targetAnalysisId }, { headers: CORS });
  }

  if (!analysisId) {
    return NextResponse.json({ error: 'analysisId required' }, { status: 400, headers: CORS });
  }

  const { data: row, error: fetchError } = await service
    .from('creator_fraud_analysis')
    .select('*, profiles:creator_id(username, display_name), audio_tracks:track_id(title, play_count)')
    .eq('id', analysisId)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Analysis row not found' }, { status: 404, headers: CORS });
  }

  const creatorIdFromRow = row.creator_id as string;
  const profile = row.profiles as { username?: string; display_name?: string } | null;
  const creatorName = profile?.display_name || profile?.username || 'Creator';

  const { data: authUser } = await service.auth.admin.getUserById(creatorIdFromRow);
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
    const track = row.audio_tracks as { title?: string; play_count?: number } | null;
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
      const template = fraudEmailTemplateForStatus('hold', {
        creatorName,
        trackTitle: track?.title ?? 'your track',
        playCount: Number(track?.play_count ?? row.total_plays ?? 0),
      });
      await sendCustomFraudReviewEmail({ to: creatorEmail, subject: template.subject, text: template.text });
      await service
        .from('creator_fraud_analysis')
        .update({ warning_email_sent: true, warning_email_sent_at: now })
        .eq('id', analysisId);
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
      .eq('id', creatorIdFromRow);

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
