'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { SocialScripts } from '@/src/components/SocialScripts';

type ConsentRecord = {
  categories: {
    necessary: true;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  };
};

const CONSENT_KEY = 'sb_cookie_consent';

const safeParse = (value: string | null): ConsentRecord | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as ConsentRecord;
  } catch {
    return null;
  }
};

export function CookieConsentScripts() {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = safeParse(localStorage.getItem(CONSENT_KEY));
    setConsent(stored);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as ConsentRecord | undefined;
      if (detail) {
        setConsent(detail);
      }
    };

    window.addEventListener('cookie-consent-updated', handler as EventListener);
    return () => window.removeEventListener('cookie-consent-updated', handler as EventListener);
  }, []);

  if (!consent) return null;

  const { functional, marketing, analytics } = consent.categories;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const twitterPixelId = process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID;

  return (
    <>
      {analytics && gaId && gaId !== 'disabled' && (
        <>
          <Script id="google-analytics" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <Script
            id="google-analytics-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { anonymize_ip: true });
              `,
            }}
          />
        </>
      )}

      {marketing && facebookPixelId && facebookPixelId !== 'disabled' && (
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
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {marketing && twitterPixelId && twitterPixelId !== 'disabled' && (
        <Script
          id="twitter-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?
              s.exe.apply(s,arguments):s.queue.push(arguments);
              },s.version='1.1',s.queue=[],u=t.createElement(n),
              u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
              a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
              twq('init','${twitterPixelId}');
              twq('track','PageView');
            `,
          }}
        />
      )}

      {marketing && facebookAppId && facebookAppId !== 'your-facebook-app-id' && (
        <Script
          id="facebook-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '${facebookAppId}',
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

      {functional && googleClientId && googleClientId !== 'disabled' && (
        <Script id="youtube-api" src="https://apis.google.com/js/api.js" strategy="afterInteractive" />
      )}

      {marketing && (
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9193690947663942"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}

      {functional && <SocialScripts />}
    </>
  );
}
