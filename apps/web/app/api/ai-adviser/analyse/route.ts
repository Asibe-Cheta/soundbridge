import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { fetchAdviserCreatorData } from '@/src/lib/ai-adviser-creator-data';
import { generateAdviserAnalysis } from '@/src/lib/ai-adviser-gemini';
import { canRunAnalysis } from '@/src/lib/ai-adviser-limits';
import {
  getAdviserUsageState,
  incrementAnalysisUsage,
  buildUsageSummary,
} from '@/src/lib/ai-adviser-usage-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const service = createServiceClient();
    const { tier, usage } = await getAdviserUsageState(service, user.id);
    const gate = canRunAnalysis(tier, usage);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason, code: 'LIMIT_REACHED' }, { status: 403, headers: corsHeaders });
    }

    const creatorData = await fetchAdviserCreatorData(service, user.id);
    const analysis = await generateAdviserAnalysis(creatorData);

    const { data: saved, error: saveErr } = await service
      .from('ai_adviser_analyses')
      .insert({
        creator_id: user.id,
        analysis_json: analysis,
      })
      .select('id, generated_at')
      .single();

    if (saveErr) {
      console.error('[ai-adviser/analyse] save failed:', saveErr);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500, headers: corsHeaders });
    }

    await incrementAnalysisUsage(service, user.id, tier);
    const updated = await getAdviserUsageState(service, user.id);

    return NextResponse.json(
      {
        analysis,
        analysisId: saved.id,
        generatedAt: saved.generated_at,
        usage: buildUsageSummary(updated.tier, updated.usage),
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[ai-adviser/analyse]', e);
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
