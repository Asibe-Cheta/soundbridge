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
      { status: adminCheck.status, headers: corsHeaders }
    );
  }

  try {
    const { data, error } = await adminCheck.serviceClient.rpc('admin_retention_metrics');

    if (error) {
      console.error('[admin/retention] rpc error', error);
      return NextResponse.json({ error: 'Failed to load retention metrics' }, { status: 500, headers: corsHeaders });
    }

    const windows = (data || []) as Array<{
      window_days: number;
      cohort_size: number;
      retained_count: number;
      retention_rate: number;
    }>;

    return NextResponse.json({ windows }, { headers: corsHeaders });
  } catch (error) {
    console.error('[admin/retention]', error);
    return NextResponse.json({ error: 'Failed to load retention metrics' }, { status: 500, headers: corsHeaders });
  }
}
