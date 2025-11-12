import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Events - Find & Create Events',
  description: 'Discover music events, concerts, and festivals on SoundBridge. Create your own event, sell tickets, and connect with music lovers worldwide.',
  keywords: [
    'music events',
    'concerts',
    'music festivals',
    'live music',
    'event tickets',
    'music shows',
    'create event',
    'sell tickets',
    'event management'
  ],
  openGraph: {
    title: 'Music Events - Find & Create Events | SoundBridge',
    description: 'Discover music events, concerts, and festivals. Create your own event and sell tickets on SoundBridge.',
    url: 'https://soundbridge.com/events',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music Events - Find & Create Events | SoundBridge',
    description: 'Discover music events, concerts, and festivals. Create your own event and sell tickets.',
  },
  alternates: {
    canonical: '/events',
  },
};

