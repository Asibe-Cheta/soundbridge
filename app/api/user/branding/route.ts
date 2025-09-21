import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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

    if (!data || data.length === 0) {
      // Return default branding if none exists
      return NextResponse.json({
        custom_logo_url: null,
        custom_logo_width: 120,
        custom_logo_height: 40,
        custom_logo_position: 'top-left',
        primary_color: '#DC2626',
        secondary_color: '#EC4899',
        accent_color: '#F97316',
        background_gradient: 'from-gray-900 via-gray-800 to-gray-900',
        layout_style: 'default',
        show_powered_by: true,
        watermark_enabled: true,
        watermark_opacity: 0.1,
        watermark_position: 'bottom-right',
        user_tier: 'free'
      });
    }

    return NextResponse.json(data[0]);
    
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
    
    // Update user branding
    const { data, error } = await supabase
      .rpc('update_user_branding', {
        user_uuid: user.id,
        custom_logo_url_param: branding.custom_logo_url,
        custom_logo_width_param: branding.custom_logo_width,
        custom_logo_height_param: branding.custom_logo_height,
        custom_logo_position_param: branding.custom_logo_position,
        primary_color_param: branding.primary_color,
        secondary_color_param: branding.secondary_color,
        accent_color_param: branding.accent_color,
        background_gradient_param: branding.background_gradient,
        layout_style_param: branding.layout_style,
        show_powered_by_param: branding.show_powered_by,
        watermark_enabled_param: branding.watermark_enabled,
        watermark_opacity_param: branding.watermark_opacity,
        watermark_position_param: branding.watermark_position
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
