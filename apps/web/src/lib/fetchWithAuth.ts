/**
 * Unified authenticated fetch helper
 * Always sends bearer token from current Supabase session
 * Works for both web and mobile contexts
 */

import { supabase } from './supabase';

interface FetchWithAuthOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchWithAuth(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options;

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (requireAuth && (!session || sessionError)) {
    throw new Error('Authentication required - no valid session found');
  }

  // Prepare headers
  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');

  // Always add bearer token if session exists
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
    
    // Add fallback headers for mobile compatibility
    headers.set('x-supabase-token', session.access_token);
  }

  // Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Still include cookies as fallback
  });

  return response;
}

/**
 * Convenience wrapper for JSON responses
 */
export async function fetchJsonWithAuth<T = any>(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<{ data: T | null; error: string | null; response: Response }> {
  try {
    const response = await fetchWithAuth(url, options);
    
    let data = null;
    let error = null;

    // Try to parse JSON
    try {
      const json = await response.json();
      
      if (response.ok) {
        data = json;
      } else {
        error = json.error || json.message || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (parseError) {
      // If JSON parsing fails but response is OK, return empty data
      if (response.ok) {
        data = null;
      } else {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }

    return { data, error, response };
  } catch (error: any) {
    return { 
      data: null, 
      error: error.message || 'Network request failed',
      response: null as any
    };
  }
}

