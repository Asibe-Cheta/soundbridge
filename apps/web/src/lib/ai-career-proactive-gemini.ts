import type { SupabaseClient } from '@supabase/supabase-js';
import { GEMINI_DEFAULT_FLASH_MODEL } from '@/src/lib/gemini-model';
import { PROACTIVE_INSIGHT_SYSTEM } from '@/src/lib/ai-career-proactive-constants';
import type { ProactiveSignalType } from '@/src/lib/ai-career-proactive-constants';

export async function generateProactiveInsight(args: {
  signalType: ProactiveSignalType;
  signalData: Record<string, unknown>;
  creatorName: string;
}): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_ADVISER_MODEL?.trim() || GEMINI_DEFAULT_FLASH_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userText = `Creator name: ${args.creatorName}
Signal type: ${args.signalType}
Signal data (JSON): ${JSON.stringify(args.signalData)}

Generate the insight now.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROACTIVE_INSIGHT_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty Gemini proactive insight response');
  return text;
}

export async function markCuratedOpportunitySurfaced(
  service: SupabaseClient,
  opportunityId: string,
  creatorId: string,
): Promise<void> {
  await service.from('curated_opportunity_surfaces').upsert(
    { opportunity_id: opportunityId, creator_id: creatorId },
    { onConflict: 'opportunity_id,creator_id', ignoreDuplicates: true },
  );
}
