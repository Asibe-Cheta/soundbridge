import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { loadPartnerRecipientEmails } from '@/src/lib/admin-bulk-email-recipients';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

/** GET /api/admin/bulk-email/partner-emails — emails for all partner accounts */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request, ADMIN_ROLES);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { emails, error } = await loadPartnerRecipientEmails(adminCheck.serviceClient);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ emails, count: emails.length });
}
