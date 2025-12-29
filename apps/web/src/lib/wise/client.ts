/**
 * Wise API Client
 * 
 * Base client class for making authenticated requests to the Wise API.
 * Handles authentication, error handling, and request formatting.
 */

import { wiseConfig } from './config';

export interface WiseApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

export class WiseClient {
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    const config = wiseConfig();
    this.apiToken = config.apiToken;
    this.baseUrl = config.apiUrl;
  }

  /**
   * Makes an authenticated request to the Wise API
   * @param endpoint - API endpoint (e.g., '/v1/transfers')
   * @param options - Fetch options (method, body, etc.)
   * @returns Promise with parsed JSON response
   * @throws Error if request fails
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${path}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-JSON responses (e.g., empty responses)
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorMessage = `Wise API error: ${response.status} ${response.statusText}`;
        let errorDetails: any = null;

        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorDetails = errorData;
          } catch {
            // If JSON parsing fails, use default error message
          }
        }

        const error: WiseApiError = {
          error: `HTTP ${response.status}`,
          message: errorMessage,
          code: response.status.toString(),
          details: errorDetails,
        };

        throw error;
      }

      // Return empty object for 204 No Content or empty responses
      if (response.status === 204 || !isJson) {
        return {} as T;
      }

      return await response.json();
    } catch (error: any) {
      // Re-throw WiseApiError as-is
      if (error.error && error.message) {
        throw error;
      }

      // Wrap other errors
      throw {
        error: 'Request failed',
        message: error.message || 'Unknown error occurred',
        details: error,
      } as WiseApiError;
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request helper
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Get a singleton instance of the Wise client
 */
let _wiseClient: WiseClient | null = null;

export function getWiseClient(): WiseClient {
  if (!_wiseClient) {
    _wiseClient = new WiseClient();
  }
  return _wiseClient;
}

export default WiseClient;

