import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * POST /api/user/push-token
 * Register or update a user's Expo push token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { push_token, device_type, device_name, device_id, app_version } = body;

    // Validate push_token
    if (!push_token) {
      return NextResponse.json({ error: 'push_token is required' }, { status: 400 });
    }

    // Validate Expo push token format
    if (!Expo.isExpoPushToken(push_token)) {
      return NextResponse.json(
        { error: 'Invalid Expo push token format' },
        { status: 400 }
      );
    }

    // Validate device_type
    if (!device_type || !['ios', 'android', 'web'].includes(device_type)) {
      return NextResponse.json(
        { error: 'device_type must be one of: ios, android, web' },
        { status: 400 }
      );
    }

    // Validate device_id
    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    // Upsert push token (insert if not exists, update if exists)
    const { data: tokenData, error: upsertError } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: user.id,
          push_token,
          device_type,
          device_name: device_name || null,
          device_id,
          app_version: app_version || null,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting push token:', upsertError);
      return NextResponse.json(
        { error: 'Failed to register push token', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Push token registered successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      data: tokenData,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/user/push-token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/push-token
 * Deactivate a user's push token
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get device_id from query params
    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    // Deactivate push token
    const { error: updateError } = await supabase
      .from('user_push_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('device_id', device_id);

    if (updateError) {
      console.error('Error deactivating push token:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate push token', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Push token deactivated successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Push token deactivated successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/push-token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

