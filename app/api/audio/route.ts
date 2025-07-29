import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, db } from '../../../src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const creatorId = searchParams.get('creator_id');

    if (creatorId) {
      const { data, error } = await db.getAudioContentByCreator(creatorId);
      
      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch audio content' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    } else {
      const { data, error } = await db.getAudioContent(limit);
      
      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch audio content' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    const { title, genre, duration, file_url, creator_id } = body;
    
    if (!title || !genre || !duration || !file_url || !creator_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new audio content
    const { data, error } = await supabase
      .from('audio_content')
      .insert({
        title,
        genre,
        duration,
        file_url,
        creator_id,
        description: body.description || null,
        artwork_url: body.artwork_url || null,
        is_public: body.is_public !== false, // Default to true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create audio content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 