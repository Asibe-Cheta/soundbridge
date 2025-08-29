import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔧 Audio API called');
    
    // Default response - use /api/audio/recent for recent tracks
    return NextResponse.json({
      success: true,
      message: 'Use /api/audio/recent for recent tracks',
      tracks: []
    });

  } catch (error) {
    console.error('❌ Audio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 