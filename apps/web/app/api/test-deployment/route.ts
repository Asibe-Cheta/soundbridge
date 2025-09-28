import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    deployment_version: 'v2024-09-28-stripe-checkout-debug',
    debug_logs_added: true,
    cors_headers_updated: true
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'POST test successful - latest deployment is live',
    timestamp: new Date().toISOString()
  });
}
