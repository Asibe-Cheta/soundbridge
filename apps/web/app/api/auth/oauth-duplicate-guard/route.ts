import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rollbackIfOAuthEmailDuplicate } from '@/src/lib/oauth-duplicate-guard';

/**
 * After client-side exchangeCodeForSession (PKCE), verify the new session is not a
 * cross-provider duplicate. Deletes the new auth user and returns { duplicate: true } if so.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.id) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const duplicate = await rollbackIfOAuthEmailDuplicate({
    email: user.email,
    currentUserId: user.id,
  });

  return NextResponse.json({ duplicate });
}
