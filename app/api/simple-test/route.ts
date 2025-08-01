import { NextResponse } from 'next/server';

export async function GET() {
  console.log('\n🔍 === SIMPLE ENVIRONMENT TEST ===');

  // Log all environment variables
  console.log('All environment variables:', Object.keys(process.env));

  // Check specific variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');

  const response = {
    timestamp: new Date().toISOString(),
    serverContext: typeof window === 'undefined',
    nodeEnv: process.env.NODE_ENV,

    // Direct environment variable checks
    environmentVariables: {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!supabaseUrl,
        value: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
        length: supabaseUrl ? supabaseUrl.length : 0
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!supabaseAnonKey,
        value: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined',
        length: supabaseAnonKey ? supabaseAnonKey.length : 0
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!supabaseServiceKey,
        value: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'undefined',
        length: supabaseServiceKey ? supabaseServiceKey.length : 0
      }
    },

    // All environment variables (filtered for security)
    allEnvVars: Object.keys(process.env).filter(key =>
      key.includes('SUPABASE') ||
      key.includes('NEXT_PUBLIC') ||
      key.includes('NODE_ENV')
    ),

    // Debug info
    debug: {
      processEnvExists: typeof process !== 'undefined' && typeof process.env !== 'undefined',
      totalEnvVars: Object.keys(process.env).length,
      hasDotEnv: !!process.env.NODE_ENV
    }
  };

  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('🔍 === END SIMPLE TEST ===\n');

  return NextResponse.json(response);
} 