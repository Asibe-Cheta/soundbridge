/**
 * External Links API Route - GET/POST
 *
 * GET  - Fetch creator's external links (public endpoint)
 * POST - Add new external link (authenticated)
 *
 * MOBILE TEAM INTEGRATION NOTES:
 * - API response format: { success: boolean, data?: { links: ExternalLink[] }, error?: string }
 * - Maximum 2 links per creator
 * - Validate using same rules as external-links-validation.ts
 * - POST requires authentication
 * - GET is public (anyone can view creator links)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@/src/lib/supabase';
import { validateExternalLink, canAddMoreLinks } from '@/src/lib/external-links-validation';
import type { PlatformType } from '@/src/lib/types/external-links';

// GET - Fetch creator's external links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = createBrowserClient();

    const { data: links, error } = await supabase
      .from('external_links')
      .select('*')
      .eq('creator_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { links: links || [] }
    });
  } catch (error: any) {
    console.error('Error fetching external links:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

// POST - Add new external link
export async function POST(request: NextRequest) {
  try {
    const supabase = createBrowserClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { platform_type, url, display_order = 1 } = body;

    if (!platform_type || !url) {
      return NextResponse.json(
        { success: false, error: 'platform_type and url are required' },
        { status: 400 }
      );
    }

    // Validate URL for platform
    const validation = validateExternalLink(platform_type as PlatformType, url);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check link limit (maximum 2 links)
    const { data: existingLinks } = await supabase
      .from('external_links')
      .select('id')
      .eq('creator_id', user.id);

    if (!canAddMoreLinks(existingLinks?.length || 0)) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 2 external links allowed' },
        { status: 400 }
      );
    }

    // Insert link
    const { data: newLink, error: insertError } = await supabase
      .from('external_links')
      .insert({
        creator_id: user.id,
        platform_type,
        url: validation.sanitizedUrl!,
        display_order
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation (duplicate platform)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: `You already have a link for ${platform_type}. Each platform can only be added once.` },
          { status: 400 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: { link: newLink }
    });
  } catch (error: any) {
    console.error('Error creating external link:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create link' },
      { status: 500 }
    );
  }
}
