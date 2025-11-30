import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServiceClient } from '@/src/lib/supabase';
import { cookies } from 'next/headers';

/**
 * POST /api/subscription/restore-tracks
 * Restore private tracks to public when user upgrades to Pro
 * This is called automatically via trigger, but can be called manually if needed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const supabaseAdmin = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has active Pro/Enterprise subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('tier', ['pro', 'enterprise'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ 
        error: 'Active Pro or Enterprise subscription required to restore tracks' 
      }, { status: 403 });
    }

    // Restore tracks using database function
    const { data: restoredCount, error: restoreError } = await supabaseAdmin
      .rpc('restore_tracks_on_upgrade', { p_user_id: user.id });

    if (restoreError) {
      console.error('Error restoring tracks:', restoreError);
      return NextResponse.json({ error: 'Failed to restore tracks' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        restored_count: restoredCount || 0,
        message: `Successfully restored ${restoredCount || 0} tracks to public visibility.`
      }
    });

  } catch (error: any) {
    console.error('Error restoring tracks:', error);
    return NextResponse.json({ 
      error: 'Failed to restore tracks',
      details: error.message 
    }, { status: 500 });
  }
}
