/**
 * API Helper Utilities for Performance & Reliability
 *
 * Provides timeout wrappers, error handling, and retry logic
 * for all API endpoints and client-side requests
 */

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wrap authentication with timeout
 * @param authFunction - Authentication function
 * @param timeoutMs - Timeout in milliseconds (default 5s)
 */
export async function withAuthTimeout<T>(
  authFunction: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return withTimeout(authFunction, timeoutMs, 'Authentication timeout');
}

/**
 * Wrap database query with timeout
 * @param query - Supabase query
 * @param timeoutMs - Timeout in milliseconds (default 8s)
 */
export async function withQueryTimeout<T>(
  query: Promise<T>,
  timeoutMs: number = 8000
): Promise<T> {
  return withTimeout(query, timeoutMs, 'Query timeout');
}

/**
 * Safe fetch with timeout and retry
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @param retries - Number of retries
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
  retries: number = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Retry logic
    if (retries > 0 && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
      console.log(`⚠️ Fetch failed, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return safeFetch(url, options, timeoutMs, retries - 1);
    }

    throw error;
  }
}

/**
 * Safe JSON fetch with error handling
 * @param url - URL to fetch
 * @param options - Fetch options
 */
export async function fetchJSON<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await safeFetch(url, options, 10000, 1);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText || 'Request failed'}`,
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {
        success: false,
        error: 'Invalid response format',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('❌ fetchJSON error:', error);
    return {
      success: false,
      error: error.message || 'Request failed',
    };
  }
}

/**
 * Create a graceful error response
 * Always returns success with empty data to prevent client loading states
 */
export function createErrorResponse(error: string, emptyData: any = {}) {
  return {
    success: true, // Return success to prevent infinite loading
    error,
    data: emptyData,
  };
}

/**
 * Log performance metrics
 */
export function logPerformance(endpoint: string, startTime: number) {
  const elapsed = Date.now() - startTime;
  const emoji = elapsed < 1000 ? '⚡' : elapsed < 3000 ? '✅' : '⚠️';
  console.log(`${emoji} ${endpoint} completed in ${elapsed}ms`);
}

/**
 * Batch requests with concurrency limit
 * @param requests - Array of request functions
 * @param concurrency - Maximum concurrent requests
 */
export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const request of requests) {
    const promise = request().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise as any), 1);
    });

    executing.push(promise as any);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Cache wrapper for API responses
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
