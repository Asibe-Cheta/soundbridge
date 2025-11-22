/**
 * Browser-side Supabase client with cookie-based session storage
 * This ensures sessions work across both client and server
 * 
 * IMPORTANT: This now uses the shared global instance from supabase.ts
 * to avoid multiple GoTrueClient instances
 */

import { supabase } from './supabase';

export function createClient() {
  // Return the global instance to avoid multiple clients
  return supabase;
}

