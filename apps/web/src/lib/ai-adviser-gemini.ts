import { GEMINI_DEFAULT_FLASH_MODEL } from '@/src/lib/gemini-model';
import type { AdviserCreatorData } from '@/src/lib/ai-adviser-creator-data';
import { formatCreatorDataForPrompt } from '@/src/lib/ai-adviser-creator-data';

export type AdviserAnalysisResult = {
  summary: string;
  insights: Array<{ title: string; detail: string; hint?: string }>;
  whatToDoToday?: { title: string; subtitle: string };
  rawText: string;
};

export type AdviserChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const ANALYSIS_SYSTEM = `You are SoundBridge AI Career Adviser for independent audio creators.
Use ONLY the creator data provided in JSON. Never invent play counts, cities, earnings, or statistics.
If data is missing or the creator is new, say so honestly and give practical onboarding guidance instead.
Respond with valid JSON only (no markdown fences) using this shape:
{
  "summary": "2-4 sentence personalised overview",
  "whatToDoToday": { "title": "...", "subtitle": "..." },
  "insights": [{ "title": "...", "detail": "...", "hint": "optional short tag" }]
}`;

const CHAT_SYSTEM = `You are SoundBridge AI Career Adviser. Answer using ONLY the creator data and conversation.
Never fabricate statistics. If data is insufficient, say so and give honest general advice.
Keep replies concise (2-5 sentences unless the user asks for detail).`;

function geminiUrl(model: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return {
    apiKey,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
  };
}

async function callGemini(args: {
  system: string;
  userText: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const model = process.env.GEMINI_ADVISER_MODEL?.trim() || GEMINI_DEFAULT_FLASH_MODEL;
  const { url } = geminiUrl(model);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.system }] },
      contents: [{ role: 'user', parts: [{ text: args.userText }] }],
      generationConfig: {
        temperature: args.temperature ?? 0.7,
        maxOutputTokens: args.maxOutputTokens ?? 2048,
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
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

/** Coerce persisted or partial API payloads into a safe render shape. */
export function normalizeAdviserAnalysis(raw: unknown): AdviserAnalysisResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<AdviserAnalysisResult>;
  const fallbackText =
    typeof obj.rawText === 'string'
      ? obj.rawText
      : typeof raw === 'string'
        ? raw
        : 'Analysis complete.';

  return {
    summary: String(obj.summary ?? fallbackText),
    insights: Array.isArray(obj.insights)
      ? obj.insights.map((i) => ({
          title: String(i?.title ?? 'Insight'),
          detail: String(i?.detail ?? ''),
          hint: i?.hint ? String(i.hint) : undefined,
        }))
      : [],
    whatToDoToday: obj.whatToDoToday
      ? {
          title: String(obj.whatToDoToday.title ?? 'Today'),
          subtitle: String(obj.whatToDoToday.subtitle ?? ''),
        }
      : undefined,
    rawText: typeof obj.rawText === 'string' ? obj.rawText : fallbackText,
  };
}

function parseAnalysisJson(raw: string): AdviserAnalysisResult {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return normalizeAdviserAnalysis({ ...JSON.parse(cleaned), rawText: raw });
  } catch {
    return normalizeAdviserAnalysis({ summary: raw, rawText: raw });
  }
}

export async function generateAdviserAnalysis(
  creatorData: AdviserCreatorData,
): Promise<AdviserAnalysisResult> {
  const userText = `Creator data:\n${formatCreatorDataForPrompt(creatorData)}\n\nGenerate a personalised career analysis.`;
  const raw = await callGemini({
    system: ANALYSIS_SYSTEM,
    userText,
    temperature: 0.65,
    maxOutputTokens: 2048,
  });
  return parseAnalysisJson(raw);
}

export async function generateAdviserChatReply(args: {
  creatorData: AdviserCreatorData;
  history: AdviserChatMessage[];
  userMessage: string;
}): Promise<string> {
  const historyText = args.history
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userText = `Creator data:\n${formatCreatorDataForPrompt(args.creatorData)}

Conversation so far:
${historyText || '(none)'}

New user message: ${args.userMessage}`;

  return callGemini({
    system: CHAT_SYSTEM,
    userText,
    temperature: 0.75,
    maxOutputTokens: 1024,
  });
}
