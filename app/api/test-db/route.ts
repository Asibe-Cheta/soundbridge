import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/src/lib/supabase';

// Enhanced environment variable validation with multiple fallback methods
const getEnvVar = (key: string, required = true): string => {
  // Try multiple ways to access environment variables
  let value = process.env[key];

  // If not found in process.env, try other methods
  if (!value) {
    // Try loading from Next.js runtime
    try {
      if (typeof global !== 'undefined' && (global as any).__NEXT_DATA__?.env?.[key]) {
        value = (global as any).__NEXT_DATA__.env[key];
      }
    } catch (e) {
      console.log(`Could not access global.__NEXT_DATA__.env for ${key}`);
    }
  }

  console.log(`🔍 Checking environment variable: ${key}`);
  console.log(`   Value: ${value ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Required: ${required ? 'Yes' : 'No'}`);
  console.log(`   Process.env access: ${!!process.env[key]}`);

  if (required && !value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error(`Available environment variables:`, Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
};

// Debug all environment variables
const debugEnvironment = () => {
  console.log('\n🔧 === ENVIRONMENT DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Server context:', typeof window === 'undefined' ? '✅ Yes' : '❌ No');

  // Check all Supabase-related environment variables
  const supabaseVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_DATABASE_URL'
  ];

  console.log('\n📋 Supabase Environment Variables:');
  supabaseVars.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ Set' : '❌ Missing';
    const preview = value ? `${value.substring(0, 20)}...` : 'undefined';
    console.log(`   ${key}: ${status} (${preview})`);
  });

  // Check all environment variables (filtered for security)
  console.log('\n📋 All Environment Variables (filtered):');
  const allEnvVars = Object.keys(process.env).filter(key =>
    key.includes('SUPABASE') ||
    key.includes('NEXT_PUBLIC') ||
    key.includes('NODE_ENV')
  );
  allEnvVars.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅ Set' : '❌ Missing';
    console.log(`   ${key}: ${status}`);
  });

  console.log('🔧 === END ENVIRONMENT DEBUG ===\n');
};

export async function GET(request: NextRequest) {
  console.log('\n🚀 === API ROUTE START ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  try {
    // Debug environment variables first
    debugEnvironment();

    // Basic response structure
    const response: {
      timestamp: string;
      status: string;
      tests: {
        connection: { passed: boolean; message: string; error: any };
        environment: { passed: boolean; message: string; error: any };
      };
      summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        message?: string;
      };
      debug?: {
        environmentVars: Record<string, boolean>;
        serverContext: boolean;
        nodeEnv: string;
        processEnvKeys: string[];
        envFileExists: boolean;
      };
    } = {
      timestamp: new Date().toISOString(),
      status: 'testing',
      tests: {
        connection: { passed: false, message: '', error: null },
        environment: { passed: false, message: '', error: null }
      },
      summary: {
        totalTests: 2,
        passedTests: 0,
        failedTests: 0
      },
      debug: {
        environmentVars: {},
        serverContext: typeof window === 'undefined',
        nodeEnv: process.env.NODE_ENV || 'unknown',
        processEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
        envFileExists: false
      }
    };

    // Test 1: Environment Variables
    console.log('\n🧪 Test 1: Environment Variables');
    try {
      // Try direct access first
      let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      console.log('Direct access results:');
      console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
      console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
      console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');

      // If not found, try alternative methods
      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        console.log('⚠️ Direct process.env access failed, trying alternative methods...');

        // Try loading from a different context
        try {
          const { config } = await import('next/config');
          const nextConfig = config();
          console.log('Next.js config:', nextConfig);
        } catch (e) {
          console.log('Could not load Next.js config:', e);
        }
      }

      // Update debug info
      response.debug!.environmentVars = {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
      };

      // Check all required variables
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }

      response.tests.environment = {
        passed: true,
        message: '✅ Environment variables configured',
        error: null
      };
      response.summary.passedTests++;
      console.log('✅ Environment test passed');
    } catch (error) {
      response.tests.environment = {
        passed: false,
        message: '❌ Environment variables missing',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      response.summary.failedTests++;
      console.log('❌ Environment test failed:', error);
    }

    // Test 2: Database Connection
    console.log('\n🧪 Test 2: Database Connection');
    try {
      const supabase = createApiClient();

      // Simple query to test connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      response.tests.connection = {
        passed: true,
        message: '✅ Database connection successful',
        error: null
      };
      response.summary.passedTests++;
      console.log('✅ Database connection test passed');
    } catch (error) {
      response.tests.connection = {
        passed: false,
        message: '❌ Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      response.summary.failedTests++;
      console.log('❌ Database connection test failed:', error);
    }

    // Generate summary
    const allPassed = response.summary.passedTests === response.summary.totalTests;
    response.status = allPassed ? 'success' : 'failed';
    response.summary.message = allPassed
      ? '🎉 All tests passed! Database connectivity working!'
      : `⚠️ ${response.summary.failedTests} test(s) failed`;

    console.log('\n📊 Test Summary:');
    console.log(`   Total tests: ${response.summary.totalTests}`);
    console.log(`   Passed: ${response.summary.passedTests}`);
    console.log(`   Failed: ${response.summary.failedTests}`);
    console.log(`   Status: ${response.status}`);
    console.log('🚀 === API ROUTE END ===\n');

    return NextResponse.json(response, {
      status: allPassed ? 200 : 500
    });

  } catch (error) {
    console.error('\n💥 API route error:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: 'API route failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      tests: {
        connection: { passed: false, message: '❌ Route failed', error: null },
        environment: { passed: false, message: '❌ Route failed', error: null }
      },
      summary: {
        totalTests: 2,
        passedTests: 0,
        failedTests: 2,
        message: '❌ API route failed to complete'
      },
      debug: {
        environmentVars: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        serverContext: typeof window === 'undefined',
        nodeEnv: process.env.NODE_ENV || 'unknown',
        processEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      }
    }, { status: 500 });
  }
} 