/**
 * External Links API Route - PUT/DELETE by ID
 *
 * PUT    - Update existing external link
 * DELETE - Remove external link
 *
 * MOBILE TEAM INTEGRATION NOTES:
 * - Both endpoints require authentication
 * - User can only modify/delete their own links (enforced by RLS + code)
 * - PUT allows updating URL and display_order
 * - Platform type cannot be changed (must delete and recreate)
 * - API response format: { success: boolean, data?: { link: ExternalLink }, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@/src/lib/supabase';
import { validateExternalLink } from '@/src/lib/external-links-validation';
import type { PlatformType } from '@/src/lib/types/external-links';

// PUT - Update link
export async function PUT(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const supabase = createBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, display_order } = body;

    // Verify ownership and get platform type
    const { data: existingLink } = await supabase
      .from('external_links')
      .select('platform_type, creator_id')
      .eq('id', params.linkId)
      .single();

    if (!existingLink || existingLink.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Link not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate new URL if provided
    if (url) {
      const validation = validateExternalLink(existingLink.platform_type as PlatformType, url);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(', ') },
          { status: 400 }
        );
      }
    }

    // Update link
    const updateData: any = { updated_at: new Date().toISOString() };
    if (url) updateData.url = url;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: updatedLink, error } = await supabase
      .from('external_links')
      .update(updateData)
      .eq('id', params.linkId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { link: updatedLink }
    });
  } catch (error: any) {
    console.error('Error updating external link:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update link' },
      { status: 500 }
    );
  }
}

// DELETE - Remove link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const supabase = createBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete link (RLS policy ensures user owns it)
    const { error } = await supabase
      .from('external_links')
      .delete()
      .eq('id', params.linkId)
      .eq('creator_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { message: 'Link deleted successfully' }
    });
  } catch (error: any) {
    console.error('Error deleting external link:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete link' },
      { status: 500 }
    );
  }
}
