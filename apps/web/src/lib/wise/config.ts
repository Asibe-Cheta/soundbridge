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
  /**
   * @deprecated Unused for verification — Wise uses JOSE (OAuth + public key) or legacy RSA PEM.
   */
  webhookSecret?: string;
  /** OAuth client ID from Wise (webhook JOSE public key + client_credentials). */
  oauthClientId?: string;
  /** OAuth client secret from Wise */
  oauthClientSecret?: string;
  /** Optional; used to fetch `/v1/subscriptions/{id}/public-key` (else static Wise docs PEM). */
  webhookSubscriptionId?: string;
  /** Optional PEM override for webhook RSA verification */
  webhookPublicKeyPem?: string;
  /** Optional Wise profile ID for recipient creation (e.g. NGN); from WISE_PROFILE_ID */
  profileId?: number;
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
  const webhookSubscriptionId = process.env.WISE_WEBHOOK_SUBSCRIPTION_ID;
  const webhookPublicKeyPem = process.env.WISE_WEBHOOK_PUBLIC_KEY_PEM;
  const oauthClientId = process.env.WISE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.WISE_OAUTH_CLIENT_SECRET;

  // Validate required environment variables
  if (!apiToken) {
    throw new Error(
      'WISE_API_TOKEN is required. Please add it to your environment variables.'
    );
  }

  // Webhooks: RSA signature verification — see webhook-signature.ts (WISE_WEBHOOK_SECRET not used).

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

  const profileId = process.env.WISE_PROFILE_ID;
  return {
    apiToken,
    environment: environment as 'sandbox' | 'live',
    apiUrl,
    webhookSecret,
    webhookSubscriptionId: webhookSubscriptionId?.trim() || undefined,
    webhookPublicKeyPem: webhookPublicKeyPem?.trim() || undefined,
    oauthClientId: oauthClientId?.trim() || undefined,
    oauthClientSecret: oauthClientSecret?.trim() || undefined,
    profileId: profileId ? parseInt(profileId, 10) : undefined,
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

