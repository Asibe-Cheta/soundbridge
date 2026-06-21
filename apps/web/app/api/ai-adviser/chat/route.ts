import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { fetchAdviserCreatorData } from '@/src/lib/ai-adviser-creator-data';
import { generateAdviserChatReply, type AdviserChatMessage } from '@/src/lib/ai-adviser-gemini';
import { canRunChat } from '@/src/lib/ai-adviser-limits';
import {
  getAdviserUsageState,
  incrementChatUsage,
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

    const body = await request.json().catch(() => ({}));
    const message = String(body.message ?? '').trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();
    const { tier, usage } = await getAdviserUsageState(service, user.id);
    const gate = canRunChat(tier, usage);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason, code: 'LIMIT_REACHED' }, { status: 403, headers: corsHeaders });
    }

    const { data: existingConvo } = await service
      .from('ai_adviser_conversations')
      .select('id, messages')
      .eq('creator_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const history = ((existingConvo?.messages as AdviserChatMessage[]) ?? []).filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    );

    const creatorData = await fetchAdviserCreatorData(service, user.id);
    const reply = await generateAdviserChatReply({ creatorData, history, userMessage: message });

    const now = new Date().toISOString();
    const updatedMessages: AdviserChatMessage[] = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ];

    if (existingConvo?.id) {
      await service
        .from('ai_adviser_conversations')
        .update({ messages: updatedMessages, last_message_at: now })
        .eq('id', existingConvo.id);
    } else {
      await service.from('ai_adviser_conversations').insert({
        creator_id: user.id,
        messages: updatedMessages,
        started_at: now,
        last_message_at: now,
      });
    }

    await incrementChatUsage(service, user.id);
    const updated = await getAdviserUsageState(service, user.id);

    return NextResponse.json(
      {
        reply,
        messages: updatedMessages,
        usage: buildUsageSummary(updated.tier, updated.usage),
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[ai-adviser/chat]', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
