import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const baseUrl = 'https://soundbridge.com';
    
    // Get current date for lastmod
    const currentDate = new Date().toISOString();
    
    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/events', priority: '0.9', changefreq: 'daily' },
      { url: '/search', priority: '0.8', changefreq: 'daily' },
      { url: '/feed', priority: '0.8', changefreq: 'hourly' },
      { url: '/legal/privacy', priority: '0.3', changefreq: 'monthly' },
      { url: '/legal/terms', priority: '0.3', changefreq: 'monthly' },
      { url: '/legal/cookies', priority: '0.3', changefreq: 'monthly' },
    ];

    // Fetch creators from database
    const { data: creators } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .eq('is_public', true as any)
      .not('username', 'is', null) as { data: any; error: any };

    // Fetch events from database
    const { data: events } = await supabase
      .from('events')
      .select('id, title, created_at, updated_at')
      .eq('is_public', true as any)
      .gte('event_date', new Date().toISOString() as any) as { data: any; error: any };

    // Fetch podcasts from database
    const { data: podcasts } = await supabase
      .from('audio_tracks')
      .select('id, title, created_at, updated_at')
      .eq('genre', 'podcast' as any)
      .eq('is_public', true as any) as { data: any; error: any };

    // Generate XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add creator profiles
    creators?.forEach((creator: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/creator/${creator.username}</loc>\n`;
      xml += `    <lastmod>${creator.updated_at || currentDate}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add events
    events?.forEach((event: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/events/${event.id}</loc>\n`;
      xml += `    <lastmod>${event.updated_at || event.created_at || currentDate}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add podcasts
    podcasts?.forEach((podcast: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/podcast/${podcast.id}</loc>\n`;
      xml += `    <lastmod>${podcast.updated_at || podcast.created_at || currentDate}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += '</urlset>';

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400', // Cache for 1 hour, CDN for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
} 