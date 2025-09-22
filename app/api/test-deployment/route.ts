import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    version: 'latest'
  });
}
