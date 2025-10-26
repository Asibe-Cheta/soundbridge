import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exportType, contentIds } = await request.json();

    if (!exportType || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: 'Export type and content IDs are required' },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    let exportedCount = 0;

    // Export audio tracks
    if (exportType === 'audio' || exportType === 'all') {
      const { data: tracks, error: tracksError } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', user.id as any)
        .in('id', contentIds as any) as { data: any; error: any };

      if (tracksError) {
        console.error('Error fetching tracks:', tracksError);
        return NextResponse.json(
          { error: 'Failed to fetch audio tracks' },
          { status: 500 }
        );
      }

      for (const track of tracks || []) {
        try {
          // Create metadata file
          const metadata = {
            title: track.title,
            artist: track.artist_name,
            album: track.album || '',
            genre: track.genre || '',
            year: new Date(track.created_at).getFullYear(),
            duration: track.duration,
            file_url: track.file_url,
            cover_art_url: track.cover_art_url,
            description: track.description || '',
            tags: track.tags || [],
            audio_quality: track.audio_quality || 'standard',
            bitrate: track.bitrate || 128,
            sample_rate: track.sample_rate || 44100,
            channels: track.channels || 2,
            codec: track.codec || 'mp3',
            created_at: track.created_at,
            is_public: track.is_public
          };

          zip.file(`tracks/${track.title.replace(/[^a-zA-Z0-9]/g, '_')}_metadata.json`, 
            JSON.stringify(metadata, null, 2));

          // Add cover art URL to a reference file
          if (track.cover_art_url) {
            zip.file(`tracks/${track.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover_art.txt`, 
              track.cover_art_url);
          }

          exportedCount++;
        } catch (error) {
          console.error(`Error processing track ${track.id}:`, error);
        }
      }
    }

    // Export podcast episodes
    if (exportType === 'podcasts' || exportType === 'all') {
      const { data: podcasts, error: podcastsError } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('creator_id', user.id as any)
        .in('id', contentIds as any) as { data: any; error: any };

      if (podcastsError) {
        console.error('Error fetching podcasts:', podcastsError);
        return NextResponse.json(
          { error: 'Failed to fetch podcast episodes' },
          { status: 500 }
        );
      }

      for (const podcast of podcasts || []) {
        try {
          const metadata = {
            title: podcast.title,
            description: podcast.description || '',
            episode_number: podcast.episode_number,
            season: podcast.season,
            duration: podcast.duration,
            file_url: podcast.file_url,
            cover_art_url: podcast.cover_art_url,
            tags: podcast.tags || [],
            category: podcast.category || '',
            explicit: podcast.explicit || false,
            created_at: podcast.created_at,
            is_public: podcast.is_public
          };

          zip.file(`podcasts/${podcast.title.replace(/[^a-zA-Z0-9]/g, '_')}_metadata.json`, 
            JSON.stringify(metadata, null, 2));

          if (podcast.cover_art_url) {
            zip.file(`podcasts/${podcast.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover_art.txt`, 
              podcast.cover_art_url);
          }

          exportedCount++;
        } catch (error) {
          console.error(`Error processing podcast ${podcast.id}:`, error);
        }
      }
    }

    // Export events
    if (exportType === 'events' || exportType === 'all') {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user.id as any)
        .in('id', contentIds as any) as { data: any; error: any };

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return NextResponse.json(
          { error: 'Failed to fetch events' },
          { status: 500 }
        );
      }

      for (const event of events || []) {
        try {
          const metadata = {
            title: event.title,
            description: event.description || '',
            venue: event.venue || '',
            address: event.address || '',
            city: event.city || '',
            state: event.state || '',
            country: event.country || '',
            event_date: event.event_date,
            event_time: event.event_time,
            end_time: event.end_time,
            ticket_price: event.ticket_price,
            currency: event.currency || 'USD',
            max_attendees: event.max_attendees,
            category: event.category || '',
            tags: event.tags || [],
            cover_image_url: event.cover_image_url,
            created_at: event.created_at,
            is_public: event.is_public
          };

          zip.file(`events/${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_metadata.json`, 
            JSON.stringify(metadata, null, 2));

          if (event.cover_image_url) {
            zip.file(`events/${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover_image.txt`, 
              event.cover_image_url);
          }

          exportedCount++;
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
        }
      }
    }

    // Add distribution guide
    const distributionGuide = `# SoundBridge Content Export Guide

## Overview
This export contains your content metadata and references for manual distribution to streaming platforms.

## File Structure
- tracks/ - Audio track metadata and cover art references
- podcasts/ - Podcast episode metadata and cover art references  
- events/ - Event metadata and cover art references

## Next Steps

### 1. Choose a Distribution Service
Popular options include:
- DistroKid ($20/year, unlimited uploads)
- CD Baby ($49/year, worldwide distribution)
- TuneCore ($29.99/year, keep 100% royalties)
- AWAL (Free with approval, 15% commission)

### 2. Prepare Your Content
- Download audio files from the URLs in metadata files
- Download cover art from the cover art URLs
- Ensure audio quality meets platform requirements (minimum 44.1kHz, 16-bit)

### 3. Upload to Distributor
- Use the metadata files to fill in distributor forms
- Upload audio files and cover art
- Set release dates and pricing
- Submit for distribution

### 4. Track Performance
- Monitor your releases through distributor dashboards
- Track streams, downloads, and earnings
- Update your SoundBridge profile with new releases

## Important Notes
- Always verify metadata accuracy before distribution
- Keep original high-quality files for future use
- Consider release timing for maximum impact
- Maintain consistent branding across platforms

## Support
For questions about distribution, consult your chosen distributor's support documentation or contact their customer service teams.

Generated on: ${new Date().toISOString()}
Exported ${exportedCount} items
`;

    zip.file('DISTRIBUTION_GUIDE.md', distributionGuide);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return the ZIP file
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="soundbridge_export_${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let content = [];

    // Get user's content based on type
    if (type === 'audio' || type === 'all') {
      const { data: tracks } = await supabase
        .from('audio_tracks')
        .select('id, title, artist_name, created_at, file_url, cover_art_url')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false }) as { data: any; error: any };

      if (tracks) {
        content.push(...tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          type: 'audio',
          artist: track.artist_name,
          created_at: track.created_at,
          file_url: track.file_url,
          cover_art_url: track.cover_art_url
        })));
      }
    }

    if (type === 'podcasts' || type === 'all') {
      const { data: podcasts } = await supabase
        .from('podcast_episodes')
        .select('id, title, description, created_at, file_url, cover_art_url')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false }) as { data: any; error: any };

      if (podcasts) {
        content.push(...podcasts.map((podcast: any) => ({
          id: podcast.id,
          title: podcast.title,
          type: 'podcast',
          description: podcast.description,
          created_at: podcast.created_at,
          file_url: podcast.file_url,
          cover_art_url: podcast.cover_art_url
        })));
      }
    }

    if (type === 'events' || type === 'all') {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, description, event_date, created_at, cover_image_url')
        .eq('creator_id', user.id as any)
        .order('created_at', { ascending: false }) as { data: any; error: any };

      if (events) {
        content.push(...events.map((event: any) => ({
          id: event.id,
          title: event.title,
          type: 'event',
          description: event.description,
          event_date: event.event_date,
          created_at: event.created_at,
          cover_image_url: event.cover_image_url
        })));
      }
    }

    return NextResponse.json({ content });

  } catch (error) {
    console.error('Error in export GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}