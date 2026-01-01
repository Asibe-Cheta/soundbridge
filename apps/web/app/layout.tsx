import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../src/styles/themes.css';
import { AudioPlayerProvider } from "@/src/contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "@/src/components/audio/GlobalAudioPlayer";
import { SocialScripts } from "@/src/components/SocialScripts";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { OnboardingProvider } from "@/src/contexts/OnboardingContext";
import { OnboardingManager } from "@/src/components/onboarding/OnboardingManager";
import Navbar from "@/src/components/layout/Navbar";
import { StructuredData, organizationStructuredData, websiteStructuredData } from "@/src/components/seo/StructuredData";
import ErrorBoundary from "@/src/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/src/components/GlobalErrorHandler";
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SoundBridge - Connect Through Music',
    template: '%s | SoundBridge'
  },
  description: 'Join SoundBridge to connect with music creators, discover amazing events, and be part of a vibrant music community. Upload your music, create events, hire professional services, and collaborate with artists worldwide.',
  keywords: [
    'music platform',
    'music creators',
    'music collaboration',
    'music events',
    'music community',
    'afrobeats',
    'gospel music',
    'uk drill',
    'highlife',
    'jazz',
    'hip hop',
    'r&b',
    'pop music',
    'electronic music',
    'music discovery',
    'artist collaboration',
    'music networking',
    'music upload',
    'podcast platform',
    'music streaming',
    'service provider',
    'music services',
    'sound engineering',
    'music lessons',
    'music photography',
    'music videography',
    'music production services',
    'mixing and mastering',
    'session musicians',
    'event management',
    'music professionals',
    'freelance music services',
    'hire music professionals'
  ],
  authors: [{ name: 'SoundBridge Team' }],
  creator: 'SoundBridge',
  publisher: 'SoundBridge',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://soundbridge.live'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SoundBridge - Connect Through Music',
    description: 'Join SoundBridge to connect with music creators, discover amazing events, hire professional services, and be part of a vibrant music community.',
    url: 'https://soundbridge.live',
    siteName: 'SoundBridge',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SoundBridge - Music Community Platform',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundBridge - Connect Through Music',
    description: 'Join SoundBridge to connect with music creators, discover amazing events, hire professional services, and be part of a vibrant music community.',
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
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
  category: 'music',
  classification: 'Music Platform',
  referrer: 'origin-when-cross-origin',
  applicationName: 'SoundBridge',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SoundBridge',
  },
  other: {
    'msapplication-TileColor': '#DC2626',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#DC2626' },
    { media: '(prefers-color-scheme: dark)', color: '#DC2626' }
  ],
  colorScheme: 'light dark',
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
        
        {/* Facebook SDK - Only load if App ID is configured */}
        {process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.NEXT_PUBLIC_FACEBOOK_APP_ID !== 'your-facebook-app-id' && (
          <Script
            id="facebook-sdk"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.fbAsyncInit = function() {
                  FB.init({
                    appId: '${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}',
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
        )}
        
        {/* YouTube API - Only load if Google Client ID is configured */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'disabled' && (
          <Script
            id="youtube-api"
            src="https://apis.google.com/js/api.js"
            strategy="afterInteractive"
          />
        )}
        
        {/* Google AdSense */}
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9193690947663942"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        <SocialScripts />
        
        {/* Structured Data */}
        <StructuredData type="organization" data={organizationStructuredData} />
        <StructuredData type="website" data={websiteStructuredData} />
      </head>
      <body className={inter.className}>
        <GlobalErrorHandler />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <OnboardingProvider>
                <AudioPlayerProvider>
                  <Navbar />
                  {children}
                  <GlobalAudioPlayer />
                  <OnboardingManager />
                </AudioPlayerProvider>
              </OnboardingProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
