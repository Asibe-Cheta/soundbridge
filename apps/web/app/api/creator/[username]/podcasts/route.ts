import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const { username: slug } = resolvedParams;

    const supabase = createServiceClient();
    const resolved = await resolveCreatorProfileBySlug(
      supabase,
      decodeURIComponent(slug)
    );

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // For now, return empty array since podcasts might not be implemented yet
    // This can be updated when podcast functionality is added
    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Error in podcasts API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
