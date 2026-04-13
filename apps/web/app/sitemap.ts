import { MetadataRoute } from 'next';
import { blogPosts } from '@/src/content/blog/posts';
import { createServiceClient } from '@/src/lib/supabase';

const BASE_URL = 'https://soundbridge.live';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isRecent(value: unknown): boolean {
  const d = toDate(value);
  return !!d && Date.now() - d.getTime() <= ONE_WEEK_MS;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();
  const baseUrl = 'https://soundbridge.live';
  const currentDate = new Date().toISOString();
  const allowedModerationStatuses = ['pending_check', 'checking', 'clean', 'approved'];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, updated_at, created_at, is_public, deleted_at, banned')
    .eq('role', 'creator')
    .is('deleted_at', null)
    .eq('banned', false);

  const { data: tracks } = await supabase
    .from('audio_tracks')
    .select('id, updated_at, created_at, moderation_status, is_public')
    .eq('is_public', true)
    .in('moderation_status', allowedModerationStatuses);

  const { data: albums } = await supabase
    .from('albums')
    .select('id, updated_at, created_at, is_public, status')
    .eq('is_public', true)
    .eq('status', 'published');

  const profileEntries: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p) => p.username && String(p.username).trim().length > 0 && p.is_public !== false)
    .map((p) => {
      const recent = isRecent(p.updated_at || p.created_at);
      return {
        url: `${BASE_URL}/profile/${encodeURIComponent(String(p.username))}`,
        lastModified: (p.updated_at || p.created_at || currentDate) as string,
        changeFrequency: recent ? ('daily' as const) : ('weekly' as const),
        priority: recent ? 1.0 : 0.8,
      };
    });

  const trackEntries: MetadataRoute.Sitemap = (tracks ?? []).map((t) => {
    const recent = isRecent(t.updated_at || t.created_at);
    return {
      url: `${BASE_URL}/track/${t.id}`,
      lastModified: (t.updated_at || t.created_at || currentDate) as string,
      changeFrequency: recent ? ('daily' as const) : ('weekly' as const),
      priority: recent ? 0.95 : 0.85,
    };
  });

  const dropEntries: MetadataRoute.Sitemap = (tracks ?? []).map((t) => {
    const recent = isRecent(t.updated_at || t.created_at);
    return {
      url: `${BASE_URL}/drop/${t.id}`,
      lastModified: (t.updated_at || t.created_at || currentDate) as string,
      changeFrequency: recent ? ('daily' as const) : ('weekly' as const),
      priority: recent ? 0.9 : 0.8,
    };
  });

  const albumEntries: MetadataRoute.Sitemap = (albums ?? []).map((a) => {
    const recent = isRecent(a.updated_at || a.created_at);
    return {
      url: `${BASE_URL}/album/${a.id}`,
      lastModified: (a.updated_at || a.created_at || currentDate) as string,
      changeFrequency: recent ? ('daily' as const) : ('weekly' as const),
      priority: recent ? 0.95 : 0.85,
    };
  });

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/creators`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/help/service-provider-guide`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/become-service-provider`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/app`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...profileEntries,
    ...trackEntries,
    ...dropEntries,
    ...albumEntries,
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/help/account-deletion`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}

