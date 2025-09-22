import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const commitHash = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'unknown';
  
  return NextResponse.json({
    message: 'Deployment test endpoint',
    timestamp,
    commitHash,
    deploymentId,
    status: 'working'
  });
}
