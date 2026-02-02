import type { Metadata } from 'next';
import HomePageClient from './page.client';

export const metadata: Metadata = {
  title: 'SoundBridge - Professional Network for Audio Creators | LinkedIn for Musicians',
  description:
    'Connect with musicians, podcasters, and producers. Promote events for free, find collaborators, and keep 90% of your revenue. Join 12,000+ creators.',
  keywords: [
    'audio creators platform',
    'musician networking',
    'podcast collaboration',
    'music events promotion',
    'professional network musicians',
    'LinkedIn for musicians'
  ],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'SoundBridge - Professional Network for Audio Creators | LinkedIn for Musicians',
    description:
      'Connect with musicians, podcasters, and producers. Promote events for free, find collaborators, and keep 90% of your revenue.',
    url: 'https://soundbridge.live',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundBridge - Professional Network for Audio Creators',
    description:
      'Promote events for free, find collaborators, and keep 90% of your revenue. Join the waitlist.'
  }
};

export default function HomePage() {
  return <HomePageClient />;
}
