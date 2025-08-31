'use client';

import Script from 'next/script';

export function HomePageSEO() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SoundBridge',
    url: 'https://soundbridge.com',
    description: 'Connect with music creators, discover amazing events, and be part of a vibrant music community',
    publisher: {
      '@type': 'Organization',
      name: 'SoundBridge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://soundbridge.com/images/logos/logo-white-lockup.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://soundbridge.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    mainEntity: {
      '@type': 'Organization',
      name: 'SoundBridge',
      url: 'https://soundbridge.com',
      logo: 'https://soundbridge.com/images/logos/logo-white-lockup.png',
      description: 'Connect with music creators, discover amazing events, and be part of a vibrant music community',
      sameAs: [
        'https://twitter.com/soundbridge',
        'https://facebook.com/soundbridge',
        'https://instagram.com/soundbridge',
        'https://youtube.com/soundbridge',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@soundbridge.com',
      },
      founder: {
        '@type': 'Person',
        name: 'SoundBridge Team',
      },
      foundingDate: '2024',
      areaServed: 'Worldwide',
      serviceType: 'Music Platform',
      category: 'Music',
    },
  };

  return (
    <>
      <Script
        id="homepage-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      {/* Additional SEO Scripts */}
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
      />
      <Script
        id="google-analytics-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_title: 'SoundBridge - Connect Through Music',
              page_location: 'https://soundbridge.com',
            });
          `,
        }}
      />
      
      {/* Facebook Pixel */}
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      
      {/* Twitter Pixel */}
      <Script
        id="twitter-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            twq('config','${process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID}');
          `,
        }}
      />
    </>
  );
}
