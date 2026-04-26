import type { Metadata } from 'next';

const title = 'Download SoundBridge';
const description =
  'The professional network for music creators. Get the SoundBridge app on iOS and Android.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/app' },
  openGraph: {
    title: `${title} | SoundBridge`,
    description,
    url: 'https://soundbridge.live/app',
    siteName: 'SoundBridge',
    type: 'website',
    images: [{ url: '/app-download/discover.png', width: 1200, height: 630, alt: 'SoundBridge app' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | SoundBridge`,
    description,
    images: ['/app-download/discover.png'],
  },
  robots: { index: true, follow: true },
};

export default function AppDownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
