import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download SoundBridge',
  description: 'Get the SoundBridge app for iOS. Professional network for audio creators.',
  alternates: {
    canonical: 'https://soundbridge.live/app',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
