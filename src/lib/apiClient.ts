import { Session } from '@supabase/supabase-js';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://soundbridge.live';

type RequestOptions = RequestInit & {
  session?: Session | null;
  accessToken?: string;
};

export const getApiBaseUrl = () => API_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { session, accessToken, headers, ...rest } = options;
  const token = accessToken || session?.access_token;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorBody: unknown = null;
    if (contentType && contentType.includes('application/json')) {
      errorBody = await response.json();
    } else {
      errorBody = await response.text();
    }

    const error = new Error('API request failed');
    (error as any).status = response.status;
    (error as any).body = errorBody;
    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}



