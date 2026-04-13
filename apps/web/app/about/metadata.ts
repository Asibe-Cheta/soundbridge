import { Metadata } from 'next';
import { getSiteUrl } from '@/src/lib/site-url';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'About SoundBridge - Professional Network for Audio Creators',
  description:
    'Learn about SoundBridge Live Ltd and our mission to make professional networking accessible for every audio creator.',
  keywords: [
    'about soundbridge',
    'audio creators platform',
    'professional network musicians',
    'music collaboration',
    'music networking'
  ],
  openGraph: {
    title: 'About SoundBridge - Professional Network for Audio Creators',
    description:
      'Learn about SoundBridge Live Ltd and our mission to make professional networking accessible for every audio creator.',
    url: `${site}/about`,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About SoundBridge - Professional Network for Audio Creators',
    description:
      'Learn about SoundBridge Live Ltd and our mission to make professional networking accessible for every audio creator.'
  },
  alternates: {
    canonical: '/about'
  }
};

