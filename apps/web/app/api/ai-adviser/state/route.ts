import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import {
  buildUsageSummary,
  getAdviserUsageState,
} from '@/src/lib/ai-adviser-usage-service';
import type { AdviserChatMessage } from '@/src/lib/ai-adviser-gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const service = createServiceClient();
    const { tier, usage } = await getAdviserUsageState(service, user.id);

    const { data: latestAnalysis } = await service
      .from('ai_adviser_analyses')
      .select('id, analysis_json, generated_at')
      .eq('creator_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: conversation } = await service
      .from('ai_adviser_conversations')
      .select('id, messages, started_at, last_message_at')
      .eq('creator_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        usage: buildUsageSummary(tier, usage),
        latestAnalysis: latestAnalysis
          ? {
              id: latestAnalysis.id,
              analysis: latestAnalysis.analysis_json,
              generatedAt: latestAnalysis.generated_at,
            }
          : null,
        conversation: conversation
          ? {
              id: conversation.id,
              messages: (conversation.messages as AdviserChatMessage[]) ?? [],
              startedAt: conversation.started_at,
              lastMessageAt: conversation.last_message_at,
            }
          : null,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[ai-adviser/state]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
