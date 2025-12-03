// Subscription polling configuration
// Adjust these values to control polling behavior

export const SUBSCRIPTION_POLLING_CONFIG = {
  // How often to check subscription status (milliseconds)
  INTERVAL_MS: 2000, // 2 seconds
  
  // Maximum number of polling attempts before timeout
  MAX_ATTEMPTS: 15, // 15 attempts × 2 seconds = 30 seconds total
  
  // How long to show success message (milliseconds)
  SUCCESS_MESSAGE_DURATION: 5000, // 5 seconds
  
  // Initial delay before starting to poll (milliseconds)
  // Useful to give webhook immediate time to process
  INITIAL_DELAY: 500, // 0.5 seconds
} as const;

export type SubscriptionPollingConfig = typeof SUBSCRIPTION_POLLING_CONFIG;
