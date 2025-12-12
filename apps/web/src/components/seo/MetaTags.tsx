'use client';

import Head from 'next/head';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'music.song' | 'event';
}

export function MetaTags({
  title = 'SoundBridge - Connect Through Music',
  description = 'Discover, share, and connect through music on SoundBridge.',
  image = '/images/logos/logo-white-lockup.png',
  url,
  type = 'website',
}: MetaTagsProps) {
  const currentUrl = url || 'https://soundbridge.live';
  const fullImageUrl = image.startsWith('http') ? image : `https://soundbridge.live${image}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#DC2626" />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      <link rel="canonical" href={currentUrl} />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
} 