import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_DATABASE_URL: !!process.env.SUPABASE_DATABASE_URL,
    SUPABASE_AUTH_HOOK_SECRET: !!process.env.SUPABASE_AUTH_HOOK_SECRET,
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'Not set'
  };

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    variables: envCheck,
    timestamp: new Date().toISOString()
  });
}
