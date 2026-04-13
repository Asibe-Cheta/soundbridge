import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/src/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
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
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
