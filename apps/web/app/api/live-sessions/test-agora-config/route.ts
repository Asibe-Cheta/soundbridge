import { NextResponse } from 'next/server';

/**
 * GET /api/live-sessions/test-agora-config
 * 
 * Tests if Agora credentials are properly configured
 * Does NOT expose the actual credentials (security)
 */
export async function GET() {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  return NextResponse.json({
    configured: !!appId && !!appCertificate,
    hasAppId: !!appId,
    hasAppCertificate: !!appCertificate,
    appIdLength: appId?.length || 0,
    appCertificateLength: appCertificate?.length || 0,
    // Expected lengths
    expectedAppIdLength: 32,
    expectedAppCertificateLength: 32,
    // Status
    status: (appId?.length === 32 && appCertificate?.length === 32) 
      ? '✅ Properly configured' 
      : '❌ Configuration issue',
  });
}

