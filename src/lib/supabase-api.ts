import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from './types';

// API route client that can access cookies (for server-side operations)
export const createApiClientWithCookies = () => {
  return createServerComponentClient<Database>({
    cookies,
  });
};
