import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import {
  USER_GROWTH_LAUNCH_DATE,
  buildUserGrowthTrend,
  type UserGrowthTrendPayload,
} from '@/src/lib/user-growth-trend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedPayload: UserGrowthTrendPayload | null = null;
let cachedAt = 0;

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

async function fetchProfileCreatedAts(serviceClient: SupabaseClient): Promise<string[]> {
  const pageSize = 1000;
  const createdAts: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await serviceClient
      .from('profiles')
      .select('created_at')
      .gte('created_at', `${USER_GROWTH_LAUNCH_DATE}T00:00:00.000Z`)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (row.created_at) createdAts.push(row.created_at);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return createdAts;
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status, headers: corsHeaders },
    );
  }

  try {
    const now = Date.now();
    if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        { ...cachedPayload, cached: true },
        {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'private, max-age=3600',
          },
        },
      );
    }

    const createdAts = await fetchProfileCreatedAts(adminCheck.serviceClient);
    const payload = buildUserGrowthTrend(createdAts);

    cachedPayload = payload;
    cachedAt = now;

    return NextResponse.json(
      { ...payload, cached: false },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'private, max-age=3600',
        },
      },
    );
  } catch (error) {
    console.error('[admin/user-growth-trend]', error);
    return NextResponse.json(
      { error: 'Failed to load user growth trend' },
      { status: 500, headers: corsHeaders },
    );
  }
}
