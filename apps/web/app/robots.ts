import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/profile/', '/creator/', '/drop/', '/track/', '/album/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/profile/', '/creator/', '/drop/', '/track/', '/album/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/profile/', '/creator/', '/drop/', '/track/', '/album/'],
      },
    ],
    sitemap: 'https://www.soundbridge.live/sitemap.xml',
    host: 'https://www.soundbridge.live',
  };
}
