// Export Supabase client and utilities
export * from './client';

// Re-export commonly used functions
export {
  createBrowserClient,
  createServerClient,
  createApiClient,
  createServiceClient,
  db
} from './client';
