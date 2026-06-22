export type SerperOrganicResult = {
  title: string;
  link: string;
  snippet?: string;
};

export type SerperSearchResponse = {
  organic?: SerperOrganicResult[];
};

/** Web search via Serper.dev (set SERPER_API_KEY on Vercel). */
export async function serperSearch(query: string, num = 5): Promise<SerperOrganicResult[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[serper] SERPER_API_KEY not configured — skipping search');
    return [];
  }

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as SerperSearchResponse;
  return (data.organic ?? []).filter((r) => r.title && r.link);
}
