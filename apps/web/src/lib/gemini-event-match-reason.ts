import type { MatchReasons } from '@/src/lib/event-match-scoring';

const SYSTEM_PROMPT =
  'You write short, warm, human personalised event recommendations in one or two sentences maximum. Never use em dashes. Never sound like an AI. Sound like a friend who knows the person well.';

type ReasonInput = {
  eventTitle: string;
  artistName: string;
  genre: string;
  eventDate: string;
  city: string;
  matchReasons: MatchReasons;
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function buildGeminiUserPrompt(input: ReasonInput): string {
  const bullets =
    input.matchReasons.signals?.length
      ? input.matchReasons.signals.map((s) => `- ${s}`).join('\n')
      : '- Strong overall match based on your activity';

  return `Generate a personalised reason why this user should attend this event.

Event: ${input.eventTitle}
Artist: ${input.artistName}
Genre: ${input.genre}
Date: ${formatEventDate(input.eventDate)}
City: ${input.city}

Why this matches:
${bullets}

Write one to two sentences maximum. Be specific. Be warm. Be human.`;
}

export async function generatePersonalisedEventReason(
  input: ReasonInput,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[gemini-event-match] GEMINI_API_KEY not configured');
    return null;
  }

  const model = process.env.GEMINI_EVENT_MATCH_MODEL?.trim() || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildGeminiUserPrompt(input) }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 120,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[gemini-event-match] API error', res.status, errText.slice(0, 300));
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  return text.replace(/\u2014/g, '-').replace(/\s+/g, ' ').trim();
}
