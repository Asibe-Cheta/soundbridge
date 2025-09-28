import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚨 TEST CHECKOUT ROUTE: REACHED SUCCESSFULLY! 🚨');
  console.log('🚨 TIMESTAMP:', new Date().toISOString());
  console.log('🚨 URL:', request.url);
  console.log('🚨 METHOD:', request.method);
  
  return NextResponse.json({
    success: true,
    message: 'TEST CHECKOUT ROUTE WORKING!',
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
