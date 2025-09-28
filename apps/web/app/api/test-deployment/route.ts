import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    deployment_version: 'v2024-09-28-stripe-checkout-timeout-fix-FORCE-DEPLOY',
    debug_logs_added: true,
    cors_headers_updated: true,
    timeout_fixes_deployed: true,
    auth_timeout: '10 seconds',
    stripe_timeout: '30 seconds'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'POST test successful - timeout fixes are live',
    timestamp: new Date().toISOString(),
    force_deploy: true
  });
}