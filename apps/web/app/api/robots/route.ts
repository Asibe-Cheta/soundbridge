import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /api/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /notifications/
Disallow: /messaging/
Disallow: /upload/
Disallow: /auth/
Disallow: /admin/
Disallow: /_next/
Disallow: /static/

# Allow important public pages
Allow: /creator/
Allow: /events/
Allow: /search/
Allow: /feed/
Allow: /podcast/
Allow: /legal/
Allow: /blog/
Allow: /about/
Allow: /how-it-works/
Allow: /waitlist/

# Crawl delay for respectful crawling
Crawl-delay: 1

# Sitemap location
Sitemap: https://soundbridge.live/sitemap.xml

# Additional sitemaps for different content types
Sitemap: https://soundbridge.live/sitemap-creators.xml
Sitemap: https://soundbridge.live/sitemap-events.xml
Sitemap: https://soundbridge.live/sitemap-podcasts.xml

# Host directive
Host: https://soundbridge.live`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  });
} 