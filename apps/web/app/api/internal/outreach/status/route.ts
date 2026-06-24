import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  return NextResponse.json(
    { is_internal_team: true, user_id: check.userId },
    { headers: CORS },
  );
}
