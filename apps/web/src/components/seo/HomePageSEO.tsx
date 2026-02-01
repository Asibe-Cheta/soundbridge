'use client';


export function HomePageSEO() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SoundBridge',
    url: 'https://soundbridge.live',
    description: 'Connect with music creators, discover amazing events, and be part of a vibrant music community',
    publisher: {
      '@type': 'Organization',
      name: 'SoundBridge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://soundbridge.live/images/logos/logo-white-lockup.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://soundbridge.live/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    mainEntity: {
      '@type': 'Organization',
      name: 'SoundBridge',
      url: 'https://soundbridge.live',
      logo: 'https://soundbridge.live/images/logos/logo-white-lockup.png',
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
        email: 'support@soundbridge.live',
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
    </>
  );
}
