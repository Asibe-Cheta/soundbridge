import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { normalizeBrandingRpcResult } from '../../../../src/lib/branding-rpc-normalize';
import { DEFAULT_BRANDING } from '../../../../src/lib/types/branding';
import type { BrandingUpdateRequest } from '../../../../src/lib/types/branding';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user branding
    const { data, error } = await supabase
      .rpc('get_user_branding', { user_uuid: user.id });

    if (error) {
      console.error('Error fetching user branding:', error);
      return NextResponse.json(
        { error: 'Failed to fetch branding settings' },
        { status: 500 }
      );
    }

    const normalized = normalizeBrandingRpcResult(data, user.id);
    if (!normalized) {
      return NextResponse.json({
        ...DEFAULT_BRANDING,
        user_id: user.id,
        custom_logo_url: undefined,
      });
    }

    return NextResponse.json(normalized);
    
  } catch (error) {
    console.error('Error in branding GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const branding: BrandingUpdateRequest = await request.json();

    const wm = branding.watermark_opacity;
    const watermark_opacity =
      wm === undefined ? undefined : wm <= 1 ? Math.round(wm * 100) : Math.round(wm);

    const { error } = await supabase.rpc('update_user_branding', {
      user_uuid: user.id,
      custom_logo_url: branding.custom_logo_url,
      custom_logo_width: branding.custom_logo_width,
      custom_logo_height: branding.custom_logo_height,
      custom_logo_position: branding.custom_logo_position,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color,
      background_gradient: branding.background_gradient,
      layout_style: branding.layout_style,
      show_powered_by: branding.show_powered_by,
      watermark_enabled: branding.watermark_enabled,
      watermark_opacity,
      watermark_position: branding.watermark_position,
      avatar_border_type: branding.avatar_border_type,
      avatar_border_color: branding.avatar_border_color ?? undefined,
      avatar_border_gradient_start: branding.avatar_border_gradient_start ?? undefined,
      avatar_border_gradient_end: branding.avatar_border_gradient_end ?? undefined,
    });

    if (error) {
      console.error('Error updating user branding:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update branding settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in branding PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
