export const digitalCardCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...digitalCardCorsHeaders,
      ...extraHeaders,
    },
  });
}
