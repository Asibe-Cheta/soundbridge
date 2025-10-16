import { NextResponse } from 'next/server';
import { UNIFIED_EVENT_CATEGORIES, MUSIC_GENRE_DEFINITIONS } from '@/types/unified-event-categories';

/**
 * GET /api/event-categories
 * Returns the unified list of event categories and music genres
 * Used by mobile and web apps for consistency
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        event_categories: UNIFIED_EVENT_CATEGORIES,
        music_genres: MUSIC_GENRE_DEFINITIONS,
        version: '1.0.0',
        last_updated: '2025-10-16',
      },
    });
  } catch (error) {
    console.error('Error fetching event categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch event categories',
      },
      { status: 500 }
    );
  }
}

