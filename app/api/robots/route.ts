import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.com';

  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /dashboard
Disallow: /admin
Disallow: /api/
Disallow: /_next/
Disallow: /messaging

# Allow important pages
Allow: /
Allow: /discover
Allow: /events
Allow: /search
Allow: /creator/
Allow: /track/
Allow: /events/

# Crawl delay for respectful crawling
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
} 