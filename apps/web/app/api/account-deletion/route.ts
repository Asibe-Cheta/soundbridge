import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServerClient } from '@/src/lib/supabase';

const DELETION_REASONS = new Set([
  'privacy_concerns',
  'not_useful',
  'found_alternative',
  'other',
]);

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const detail = typeof body?.detail === 'string' ? body.detail.trim() : null;

    if (!DELETION_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    const requestedByIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null;

    const serviceClient = createServerClient();

    const { data: existingRequest, error: existingError } = await serviceClient
      .from('account_deletion_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing deletion request:', existingError);
      return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 });
    }

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Deletion already pending' },
        { status: 409 }
      );
    }

    const { error: insertError } = await serviceClient
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason,
        detail: detail || null,
        requested_by_ip: requestedByIp,
      });

    if (insertError) {
      console.error('Error creating deletion request:', insertError);
      return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 });
    }

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error soft-deleting profile:', profileError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected account deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
