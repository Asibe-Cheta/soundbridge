/**
 * API Endpoint: Register/Update Push Token
 * POST /api/user/push-token
 * 
 * Registers or updates an Expo push token for the authenticated user
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('📱 Push Token Registration: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { pushToken, platform, deviceId, deviceName } = await request.json();
    
    // Validate inputs
    if (!pushToken || !platform) {
      return NextResponse.json(
        { error: 'pushToken and platform are required' },
        { status: 400 }
      );
    }
    
    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { error: 'platform must be ios or android' },
        { status: 400 }
      );
    }
    
    console.log(`📱 Registering push token for user ${user.id} on ${platform}`);
    
    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('user_push_tokens')
      .select('id, user_id')
      .eq('push_token', pushToken)
      .single();
    
    let tokenId: string;
    
    if (existingToken) {
      // Update existing token
      if (existingToken.user_id !== user.id) {
        // Token belongs to different user - deactivate old and create new
        await supabase
          .from('user_push_tokens')
          .update({ active: false })
          .eq('push_token', pushToken);
        
        const { data: newToken, error: insertError } = await supabase
          .from('user_push_tokens')
          .insert({
            user_id: user.id,
            push_token: pushToken,
            platform,
            device_id: deviceId || null,
            device_name: deviceName || null,
            active: true,
            last_used_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('Error creating new token:', insertError);
          return NextResponse.json(
            { error: 'Failed to register push token' },
            { status: 500 }
          );
        }
        
        tokenId = newToken!.id;
      } else {
        // Update existing token for same user
        const { error: updateError } = await supabase
          .from('user_push_tokens')
          .update({
            active: true,
            device_id: deviceId || null,
            device_name: deviceName || null,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);
        
        if (updateError) {
          console.error('Error updating token:', updateError);
          return NextResponse.json(
            { error: 'Failed to update push token' },
            { status: 500 }
          );
        }
        
        tokenId = existingToken.id;
      }
    } else {
      // Create new token
      const { data: newToken, error: insertError } = await supabase
        .from('user_push_tokens')
        .insert({
          user_id: user.id,
          push_token: pushToken,
          platform,
          device_id: deviceId || null,
          device_name: deviceName || null,
          active: true,
          last_used_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Error inserting token:', insertError);
        return NextResponse.json(
          { error: 'Failed to register push token' },
          { status: 500 }
        );
      }
      
      tokenId = newToken!.id;
    }
    
    console.log(`✅ Push token registered successfully: ${tokenId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
      tokenId,
    });
  } catch (error: any) {
    console.error('❌ Error in push token registration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('📱 Push Token Deletion: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get push token from query params
    const { searchParams } = new URL(request.url);
    const pushToken = searchParams.get('pushToken');
    
    if (!pushToken) {
      return NextResponse.json(
        { error: 'pushToken query parameter required' },
        { status: 400 }
      );
    }
    
    // Deactivate token
    const { error } = await supabase
      .from('user_push_tokens')
      .update({ active: false })
      .eq('push_token', pushToken)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deactivating token:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate push token' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Push token deactivated successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Push token deactivated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error in push token deletion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
