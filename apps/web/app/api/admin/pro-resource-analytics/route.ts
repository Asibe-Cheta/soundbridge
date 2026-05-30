import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status, headers: corsHeaders },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Math.max(10, Number(searchParams.get('limit') || 100)));

  const { serviceClient } = adminCheck;

  const [summaryResult, eventsResult] = await Promise.all([
    serviceClient.from('pro_resource_analytics_summary').select('*'),
    serviceClient.from('pro_resource_user_events').select('*').limit(limit),
  ]);

  if (summaryResult.error) {
    return NextResponse.json(
      { error: summaryResult.error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (eventsResult.error) {
    return NextResponse.json(
      { error: eventsResult.error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    {
      summary: summaryResult.data || [],
      recentEvents: eventsResult.data || [],
    },
    { headers: corsHeaders },
  );
}
