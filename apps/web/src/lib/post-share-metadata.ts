import type { Metadata } from 'next';
import { createServiceClient } from '@/src/lib/supabase';
import { getSiteUrl } from '@/src/lib/site-url';

/** Matches root `app/layout.tsx` default OG asset (metadataBase resolves relative URLs). */
const DEFAULT_OG_PATH = '/images/og-image.jpg';

function toAbsoluteUrl(href: string | undefined | null, siteUrl: string): string | null {
  if (!href) return null;
  const t = href.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('/')) return `${siteUrl}${t}`;
  return `${siteUrl}/${t}`;
}

function truncateDescription(text: string, max = 150): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s.length) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 3))}...`;
}

function postAbsoluteUrl(siteUrl: string, postId: string): string {
  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  return `${base}/post/${postId}`;
}

/**
 * Open Graph / Twitter metadata for `/post/[id]` share previews (WhatsApp, iMessage, etc.).
 * Uses Supabase service role so crawlers (no cookies) still resolve **public** posts.
 */
export async function buildPostShareMetadata(postId: string): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const canonicalPath = `/post/${postId}`;
  const absolutePostUrl = postAbsoluteUrl(siteUrl, postId);

  const genericPublic: Metadata = {
    title: { absolute: 'Post on SoundBridge' },
    description: 'View posts on SoundBridge — connect through music.',
    openGraph: {
      title: 'Post on SoundBridge',
      description: 'View posts on SoundBridge — connect through music.',
      url: absolutePostUrl,
      siteName: 'SoundBridge',
      type: 'article',
      images: [
        {
          url: DEFAULT_OG_PATH,
          width: 1200,
          height: 630,
          alt: 'SoundBridge',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Post on SoundBridge',
      description: 'View posts on SoundBridge — connect through music.',
      images: [DEFAULT_OG_PATH],
    },
    alternates: { canonical: canonicalPath },
  };

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return genericPublic;
  }

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('id, content, visibility, image_urls, user_id, deleted_at')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post || post.deleted_at) {
      return genericPublic;
    }

    if (post.visibility !== 'public') {
      return {
        title: { absolute: 'Post on SoundBridge' },
        description: 'This post is not public.',
        robots: { index: false, follow: false },
        openGraph: {
          title: 'Post on SoundBridge',
          description: 'This post is not public.',
          url: absolutePostUrl,
          siteName: 'SoundBridge',
          type: 'article',
          images: [{ url: DEFAULT_OG_PATH, width: 1200, height: 630, alt: 'SoundBridge' }],
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Post on SoundBridge',
          images: [DEFAULT_OG_PATH],
        },
        alternates: { canonical: canonicalPath },
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', post.user_id)
      .maybeSingle();

    const displayName =
      profile?.display_name?.trim() || profile?.username?.trim() || 'SoundBridge';
    const pageTitle = `${displayName} on SoundBridge`;

    let imageUrl: string | null = null;
    const rawUrls = post.image_urls as unknown;
    if (Array.isArray(rawUrls) && rawUrls.length > 0 && typeof rawUrls[0] === 'string') {
      imageUrl = toAbsoluteUrl(rawUrls[0], siteUrl);
    }

    if (!imageUrl) {
      const { data: attachments } = await supabase
        .from('post_attachments')
        .select('file_url, attachment_type')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      const img = attachments?.find(
        (a) => a.attachment_type === 'image' || a.attachment_type === 'photo',
      );
      if (img?.file_url) {
        imageUrl = toAbsoluteUrl(img.file_url, siteUrl);
      }
    }

    const ogImageAbsolute = imageUrl || `${siteUrl}${DEFAULT_OG_PATH}`;
    const rawContent = typeof post.content === 'string' ? post.content : '';
    const description =
      truncateDescription(rawContent) || `See what ${displayName} shared on SoundBridge.`;

    return {
      title: { absolute: pageTitle },
      description,
      openGraph: {
        title: pageTitle,
        description,
        url: absolutePostUrl,
        siteName: 'SoundBridge',
        type: 'article',
        images: [
          {
            url: ogImageAbsolute,
            width: 1200,
            height: 630,
            alt: pageTitle,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description,
        images: [ogImageAbsolute],
      },
      alternates: { canonical: canonicalPath },
    };
  } catch (e) {
    console.error('[buildPostShareMetadata]', e);
    return genericPublic;
  }
}
