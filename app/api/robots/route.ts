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

# Crawl delay for respectful crawling
Crawl-delay: 1

# Sitemap location
Sitemap: https://soundbridge.com/sitemap.xml

# Additional sitemaps for different content types
Sitemap: https://soundbridge.com/sitemap-creators.xml
Sitemap: https://soundbridge.com/sitemap-events.xml
Sitemap: https://soundbridge.com/sitemap-podcasts.xml

# Host directive
Host: https://soundbridge.com`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  });
} 