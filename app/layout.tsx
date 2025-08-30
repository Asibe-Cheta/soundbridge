import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AudioPlayerProvider } from "@/src/contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "@/src/components/audio/GlobalAudioPlayer";
import { SocialScripts } from "@/src/components/SocialScripts";
import { AuthProvider } from "@/src/contexts/AuthContext";
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SoundBridge - Connect with Creators, Discover Amazing Events',
  description: 'Join SoundBridge to connect with music creators, discover amazing events, and be part of a vibrant music community. Upload your music, create events, and collaborate with artists worldwide.',
  keywords: 'music, creators, events, collaboration, afrobeats, gospel, uk drill, highlife, jazz, hip hop, r&b, pop, electronic',
  authors: [{ name: 'SoundBridge Team' }],
  creator: 'SoundBridge',
  publisher: 'SoundBridge',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://soundbridge.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SoundBridge - Connect with Creators, Discover Amazing Events',
    description: 'Join SoundBridge to connect with music creators, discover amazing events, and be part of a vibrant music community.',
    url: 'https://soundbridge.com',
    siteName: 'SoundBridge',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SoundBridge - Music Community Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundBridge - Connect with Creators, Discover Amazing Events',
    description: 'Join SoundBridge to connect with music creators, discover amazing events, and be part of a vibrant music community.',
    images: ['/images/og-image.jpg'],
    creator: '@soundbridge',
    site: '@soundbridge',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://aunxdbqukbxyyiusaeqi.supabase.co" />
        
        {/* Facebook SDK */}
        <Script
          id="facebook-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'your-facebook-app-id'}',
                  cookie: true,
                  xfbml: true,
                  version: 'v18.0'
                });
              };
              (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));
            `,
          }}
        />
        
        {/* YouTube API */}
        <Script
          id="youtube-api"
          src="https://apis.google.com/js/api.js"
          strategy="afterInteractive"
        />
        
        <SocialScripts />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AudioPlayerProvider>
            {children}
            <GlobalAudioPlayer />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
