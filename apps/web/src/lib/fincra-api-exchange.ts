/**
 * Builds redacted curl + request/response snapshots for admin Fincra debugging.
 */

export type FincraApiExchange = {
  at: string;
  method: string;
  url: string;
  curl: string;
  request_headers: Record<string, string>;
  request_body: unknown;
  response_status: number;
  response_body: unknown;
};

const SENSITIVE_HEADER_KEYS = new Set(['api-key', 'authorization', 'x-pub-key']);

function redactHeaderValue(key: string, value: string): string {
  const k = key.toLowerCase();
  if (!SENSITIVE_HEADER_KEYS.has(k)) return value;
  const v = value.trim();
  if (!v) return '(missing)';
  if (k === 'authorization' && /^bearer\s+/i.test(v)) {
    const token = v.replace(/^bearer\s+/i, '').trim();
    return `Bearer ${maskToken(token)}`;
  }
  return maskToken(v);
}

function maskToken(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return '***';
  return `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})`;
}

function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

/** Deep-clone and redact account numbers / names in payout payloads for safe display. */
export function redactFincraPayload(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactFincraPayload);

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const k = key.toLowerCase();
    if (
      k === 'accountnumber' ||
      k === 'account_number' ||
      k === 'bankaccountnumber'
    ) {
      out[key] = typeof raw === 'string' ? maskAccountNumber(raw) : raw;
    } else if (typeof raw === 'object' && raw !== null) {
      out[key] = redactFincraPayload(raw);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

export function buildFincraCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): string {
  const safeHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    safeHeaders[k] = redactHeaderValue(k, v);
  }

  const lines = [`curl -X ${method.toUpperCase()} '${url}'`];
  for (const [k, v] of Object.entries(safeHeaders)) {
    lines.push(`  -H '${k}: ${v.replace(/'/g, "'\\''")}'`);
  }
  if (body !== undefined) {
    const json = JSON.stringify(redactFincraPayload(body));
    lines.push(`  -d '${json.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(' \\\n');
}

export function buildFincraApiExchange(params: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  responseStatus: number;
  responseBody: unknown;
}): FincraApiExchange {
  const safeHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(params.headers)) {
    safeHeaders[k] = redactHeaderValue(k, v);
  }

  return {
    at: new Date().toISOString(),
    method: params.method.toUpperCase(),
    url: params.url,
    curl: buildFincraCurl(params.method, params.url, params.headers, params.body),
    request_headers: safeHeaders,
    request_body: redactFincraPayload(params.body ?? null),
    response_status: params.responseStatus,
    response_body: params.responseBody,
  };
}

export type FincraHttpError = Error & {
  status?: number;
  details?: unknown;
  fincraExchange?: FincraApiExchange;
};
