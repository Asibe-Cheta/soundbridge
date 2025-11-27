import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join SoundBridge Waitlist - LinkedIn for Music Creators | UK Music Platform',
  description: 'Be among the first artists to join SoundBridge. Earn 95% from tips, connect with industry professionals, and build your music career. UK-based platform launching 2026.',
  keywords: 'UK music platform, independent artists, music networking, artist earnings, music monetization, direct fan support, music industry professionals',
  openGraph: {
    title: 'Join SoundBridge Waitlist - Revolution in Music Monetization',
    description: 'Earn 95% from tips. Network with industry pros. Build your music career.',
    url: 'https://soundbridge.live/waitlist',
    siteName: 'SoundBridge',
    type: 'website',
    images: [
      {
        url: 'https://soundbridge.live/images/waitlist-og-image.jpg', // Update with actual image URL
        width: 1200,
        height: 630,
        alt: 'SoundBridge Waitlist - Join the Revolution in Music Monetization',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join SoundBridge Waitlist',
    description: 'Earn 95% from tips. Network like LinkedIn for music.',
    images: ['https://soundbridge.live/images/waitlist-og-image.jpg'], // Update with actual image URL
  },
  alternates: {
    canonical: 'https://soundbridge.live/waitlist',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

