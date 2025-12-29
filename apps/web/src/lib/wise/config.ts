/**
 * Wise API Configuration
 * 
 * Provides type-safe access to Wise API configuration from environment variables.
 * Validates that required environment variables are set.
 */

export interface WiseConfig {
  apiToken: string;
  environment: 'sandbox' | 'live';
  apiUrl: string;
  webhookSecret: string;
}

/**
 * Validates and returns Wise configuration from environment variables.
 * Throws an error if required variables are missing.
 * 
 * @returns WiseConfig object with validated configuration
 * @throws Error if required environment variables are missing
 */
export function getWiseConfig(): WiseConfig {
  const apiToken = process.env.WISE_API_TOKEN;
  const environment = process.env.WISE_ENVIRONMENT || 'live';
  const webhookSecret = process.env.WISE_WEBHOOK_SECRET;

  // Validate required environment variables
  if (!apiToken) {
    throw new Error(
      'WISE_API_TOKEN is required. Please add it to your environment variables.'
    );
  }

  if (!webhookSecret) {
    throw new Error(
      'WISE_WEBHOOK_SECRET is required. Please add it to your environment variables.'
    );
  }

  // Validate environment value
  if (environment !== 'sandbox' && environment !== 'live') {
    throw new Error(
      `WISE_ENVIRONMENT must be either 'sandbox' or 'live'. Got: ${environment}`
    );
  }

  // Determine API URL based on environment
  const apiUrl = process.env.WISE_API_URL || (
    environment === 'live'
      ? 'https://api.wise.com'
      : 'https://api.sandbox.transferwise.tech'
  );

  return {
    apiToken,
    environment: environment as 'sandbox' | 'live',
    apiUrl,
    webhookSecret,
  };
}

/**
 * Wise configuration instance.
 * Access this after ensuring environment variables are set.
 * 
 * @example
 * ```typescript
 * import { wiseConfig } from '@/src/lib/wise/config';
 * 
 * const response = await fetch(`${wiseConfig.apiUrl}/v1/profiles`, {
 *   headers: {
 *     'Authorization': `Bearer ${wiseConfig.apiToken}`,
 *   },
 * });
 * ```
 */
let _wiseConfig: WiseConfig | null = null;

/**
 * Gets or initializes the Wise configuration.
 * Caches the configuration after first access.
 * 
 * @returns WiseConfig object
 */
export function wiseConfig(): WiseConfig {
  if (!_wiseConfig) {
    _wiseConfig = getWiseConfig();
  }
  return _wiseConfig;
}

/**
 * Resets the cached Wise configuration.
 * Useful for testing or when environment variables change.
 */
export function resetWiseConfig(): void {
  _wiseConfig = null;
}

// Export default config getter
export default wiseConfig;

