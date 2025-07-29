import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { ServiceWorkerRegistration } from "@/src/components/performance/ServiceWorkerRegistration";
import { PerformanceMonitor } from "@/src/components/performance/PerformanceMonitor";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "SoundBridge - Connect Through Music",
    template: "%s | SoundBridge"
  },
  description: "Discover, share, and connect through music on SoundBridge. Join the community of creators and listeners in the UK and Nigeria markets.",
  keywords: ["music", "audio", "creators", "events", "community", "soundbridge", "uk", "nigeria"],
  authors: [{ name: "SoundBridge Team" }],
  creator: "SoundBridge",
  publisher: "SoundBridge",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'SoundBridge - Connect Through Music',
    description: 'Discover, share, and connect through music on SoundBridge.',
    siteName: 'SoundBridge',
    images: [
      {
        url: '/images/logos/logo-white-lockup.png',
        width: 1200,
        height: 630,
        alt: 'SoundBridge Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundBridge - Connect Through Music',
    description: 'Discover, share, and connect through music on SoundBridge.',
    images: ['/images/logos/logo-white-lockup.png'],
    creator: '@soundbridge',
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
  category: 'music',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/images/logos/logo-white-lockup.png" as="image" />

        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//*.supabase.co" />
        <link rel="dns-prefetch" href="//*.supabase.com" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://*.supabase.co" />
        <link rel="preconnect" href="https://*.supabase.com" />

        {/* Structured data for organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SoundBridge",
              "url": "https://soundbridge.com",
              "logo": "https://soundbridge.com/images/logos/logo-white-lockup.png",
              "description": "Connect Through Music",
              "sameAs": [
                "https://twitter.com/soundbridge",
                "https://facebook.com/soundbridge",
                "https://instagram.com/soundbridge"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "email": "support@soundbridge.com"
              }
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* Performance monitoring */}
        <PerformanceMonitor pageName="root" />

        {/* Service worker registration */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
