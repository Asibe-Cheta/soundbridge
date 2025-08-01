import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const tests: {
    connection: { passed: boolean; message: string; error: unknown };
    environment: { passed: boolean; message: string; error: unknown };
  } = {
    connection: { passed: false, message: '', error: null },
    environment: { passed: false, message: '', error: null }
  };

  // Test 1: Database Connection
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      tests.connection = {
        passed: false,
        message: `Database connection failed: ${error.message}`,
        error: error
      };
    } else {
      tests.connection = {
        passed: true,
        message: 'Database connection successful',
        error: null
      };
    }
  } catch (error) {
    tests.connection = {
      passed: false,
      message: 'Database connection failed',
      error: error
    };
  }

  // Test 2: Environment Variables
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      tests.environment = {
        passed: false,
        message: 'Missing required environment variables',
        error: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found'
      };
    } else {
      tests.environment = {
        passed: true,
        message: 'Environment variables configured correctly',
        error: null
      };
    }
  } catch (error) {
    tests.environment = {
      passed: false,
      message: 'Environment check failed',
      error: error
    };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    tests
  });
} 