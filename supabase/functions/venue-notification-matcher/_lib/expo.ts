const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: any;
  channelId?: string;
}

interface PushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<PushReceipt[]> {
  if (messages.length === 0) return [];
  const chunks = chunkArray(messages, CHUNK_SIZE);
  const allReceipts: PushReceipt[] = [];
  for (const chunk of chunks) {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };
      if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
      const response = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk) });
      if (!response.ok) {
        allReceipts.push(...chunk.map(() => ({ status: 'error' as const, message: `Expo API error: ${response.status}` })));
        continue;
      }
      const { data } = await response.json();
      allReceipts.push(...data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      allReceipts.push(...chunk.map(() => ({ status: 'error' as const, message })));
    }
  }
  return allReceipts;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}
