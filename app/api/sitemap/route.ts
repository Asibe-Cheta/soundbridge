import { NextResponse } from 'next/server';
import { createBrowserClient } from '@/src/lib/supabase';

export async function GET() {
  try {
    const supabase = createBrowserClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.com';

    // Get all public tracks
    const { data: tracks } = await supabase
      .from('audio_tracks')
      .select('id, title, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Get all public events
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    // Get all public profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, created_at')
      .not('username', 'is', null);

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/discover</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/events</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/upload</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Creator Profiles -->
  ${profiles?.map(profile => `
  <url>
    <loc>${baseUrl}/creator/${profile.username}</loc>
    <lastmod>${profile.created_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('') || ''}

  <!-- Audio Tracks -->
  ${tracks?.map(track => `
  <url>
    <loc>${baseUrl}/track/${track.id}</loc>
    <lastmod>${track.created_at}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  `).join('') || ''}

  <!-- Events -->
  ${events?.map(event => `
  <url>
    <loc>${baseUrl}/events/${event.id}</loc>
    <lastmod>${event.event_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('') || ''}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
} 