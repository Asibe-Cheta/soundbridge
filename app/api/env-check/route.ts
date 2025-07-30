import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  console.log('\n🔍 === ENVIRONMENT FILE CHECK ===');

  try {
    // Check if .env.local exists
    const envPath = join(process.cwd(), '.env.local');
    const envExists = existsSync(envPath);

    console.log('Environment file check:');
    console.log('  Path:', envPath);
    console.log('  Exists:', envExists);

    let envContent = '';
    if (envExists) {
      try {
        envContent = readFileSync(envPath, 'utf8');
        console.log('  File size:', envContent.length, 'characters');
        console.log('  First 200 chars:', envContent.substring(0, 200));
      } catch (error) {
        console.log('  Error reading file:', error);
      }
    }

    // Check environment variables
    const supabaseVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    console.log('Environment variables:');
    Object.entries(supabaseVars).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? 'SET' : 'MISSING'}`);
      if (value) {
        console.log(`    Length: ${value.length}`);
        console.log(`    Preview: ${value.substring(0, 20)}...`);
      }
    });

    const response = {
      timestamp: new Date().toISOString(),
      envFile: {
        exists: envExists,
        path: envPath,
        size: envContent.length,
        preview: envContent.substring(0, 200)
      },
      environmentVariables: {
        NEXT_PUBLIC_SUPABASE_URL: {
          exists: !!supabaseVars.NEXT_PUBLIC_SUPABASE_URL,
          length: supabaseVars.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          preview: supabaseVars.NEXT_PUBLIC_SUPABASE_URL ? `${supabaseVars.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 'undefined'
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
          exists: !!supabaseVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          length: supabaseVars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
          preview: supabaseVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${supabaseVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'undefined'
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!supabaseVars.SUPABASE_SERVICE_ROLE_KEY,
          length: supabaseVars.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
          preview: supabaseVars.SUPABASE_SERVICE_ROLE_KEY ? `${supabaseVars.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'undefined'
        }
      },
      debug: {
        nodeEnv: process.env.NODE_ENV,
        serverContext: typeof window === 'undefined',
        totalEnvVars: Object.keys(process.env).length,
        supabaseEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      }
    };

    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('🔍 === END ENVIRONMENT FILE CHECK ===\n');

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 Environment check error:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Environment check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 