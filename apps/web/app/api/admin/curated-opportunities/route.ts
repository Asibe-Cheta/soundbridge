import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OPPORTUNITY_TYPES = [
  'open_mic',
  'venue',
  'policy_change',
  'brand_partnership',
  'industry_news',
] as const;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const { data, error } = await service
    .from('curated_opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ opportunities: data ?? [] }, { headers: CORS });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const description = body.description != null ? String(body.description).trim() : null;
  const opportunityType = String(body.opportunity_type ?? body.opportunityType ?? '').trim();
  const locationCity = body.location_city ?? body.locationCity ?? null;
  const sourceUrl = body.source_url ?? body.sourceUrl ?? null;
  const expiresAt = body.expires_at ?? body.expiresAt ?? null;

  let genreTags: string[] = [];
  if (Array.isArray(body.genre_tags)) {
    genreTags = body.genre_tags.map((g: unknown) => String(g).trim()).filter(Boolean);
  } else if (Array.isArray(body.genreTags)) {
    genreTags = body.genreTags.map((g: unknown) => String(g).trim()).filter(Boolean);
  } else if (typeof body.genre_tags === 'string') {
    genreTags = body.genre_tags.split(',').map((g: string) => g.trim()).filter(Boolean);
  }

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400, headers: CORS });
  }
  if (!OPPORTUNITY_TYPES.includes(opportunityType as (typeof OPPORTUNITY_TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid opportunity_type' }, { status: 400, headers: CORS });
  }

  const service = admin.serviceClient;
  const { data, error } = await service
    .from('curated_opportunities')
    .insert({
      title,
      description,
      opportunity_type: opportunityType,
      genre_tags: genreTags,
      location_city: locationCity ? String(locationCity).trim() : null,
      source_url: sourceUrl ? String(sourceUrl).trim() : null,
      expires_at: expiresAt || null,
      created_by: admin.userId,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ success: true, opportunity: data }, { headers: CORS });
}
