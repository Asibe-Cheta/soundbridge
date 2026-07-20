import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data, error } = await admin.serviceClient
    .from('partner_agreement_signups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data || [] });
}
