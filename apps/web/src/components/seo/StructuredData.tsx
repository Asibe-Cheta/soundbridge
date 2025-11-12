'use client';

import Script from 'next/script';

interface StructuredDataProps {
  type: 'organization' | 'website' | 'music.song' | 'event' | 'person' | 'podcast' | 'service';
  data: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  const structuredData = {
    ...baseStructuredData,
    ...data,
  };

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}

// Predefined structured data for common use cases
export const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SoundBridge',
  url: 'https://soundbridge.com',
  logo: 'https://soundbridge.com/images/logos/logo-white-lockup.png',
  description: 'Connect with music creators, discover amazing events, hire professional services, and be part of a vibrant music community',
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
};

export const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SoundBridge',
  url: 'https://soundbridge.com',
  description: 'Connect with music creators, discover amazing events, hire professional services, and be part of a vibrant music community',
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
};

export const breadcrumbStructuredData = (breadcrumbs: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((breadcrumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: breadcrumb.name,
    item: breadcrumb.url,
  })),
});

export const musicSongStructuredData = (song: {
  name: string;
  artist: string;
  album?: string;
  duration?: string;
  genre?: string;
  url: string;
  image?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'MusicRecording',
  name: song.name,
  byArtist: {
    '@type': 'MusicGroup',
    name: song.artist,
  },
  ...(song.album && { inAlbum: { '@type': 'MusicAlbum', name: song.album } }),
  ...(song.duration && { duration: song.duration }),
  ...(song.genre && { genre: song.genre }),
  url: song.url,
  ...(song.image && {
    image: {
      '@type': 'ImageObject',
      url: song.image,
    },
  }),
});

export const eventStructuredData = (event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
  };
  organizer: {
    name: string;
    url?: string;
  };
  url: string;
  image?: string;
  price?: string;
  currency?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: event.name,
  description: event.description,
  startDate: event.startDate,
  ...(event.endDate && { endDate: event.endDate }),
  location: {
    '@type': 'Place',
    name: event.location.name,
    ...(event.location.address && { address: event.location.address }),
    ...(event.location.city && { addressLocality: event.location.city }),
    ...(event.location.country && { addressCountry: event.location.country }),
  },
  organizer: {
    '@type': 'Organization',
    name: event.organizer.name,
    ...(event.organizer.url && { url: event.organizer.url }),
  },
  url: event.url,
  ...(event.image && {
    image: {
      '@type': 'ImageObject',
      url: event.image,
    },
  }),
  ...(event.price && {
    offers: {
      '@type': 'Offer',
      price: event.price,
      priceCurrency: event.currency || 'USD',
      availability: 'https://schema.org/InStock',
    },
  }),
});

export const personStructuredData = (person: {
  name: string;
  description?: string;
  image?: string;
  url: string;
  sameAs?: string[];
  jobTitle?: string;
  worksFor?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: person.name,
  ...(person.description && { description: person.description }),
  ...(person.image && {
    image: {
      '@type': 'ImageObject',
      url: person.image,
    },
  }),
  url: person.url,
  ...(person.sameAs && { sameAs: person.sameAs }),
  ...(person.jobTitle && { jobTitle: person.jobTitle }),
  ...(person.worksFor && { worksFor: { '@type': 'Organization', name: person.worksFor } }),
});

export const serviceProviderStructuredData = (provider: {
  name: string;
  description?: string;
  url: string;
  image?: string;
  serviceType?: string[];
  price?: string;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: provider.name,
  ...(provider.description && { description: provider.description }),
  url: provider.url,
  ...(provider.image && {
    image: {
      '@type': 'ImageObject',
      url: provider.image,
    },
  }),
  ...(provider.serviceType && { serviceType: provider.serviceType }),
  ...(provider.price && {
    offers: {
      '@type': 'Offer',
      price: provider.price,
      priceCurrency: provider.currency || 'USD',
    },
  }),
  ...(provider.rating && { aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: provider.rating,
    reviewCount: provider.reviewCount || 0,
  }}),
  ...(provider.location && { areaServed: {
    '@type': 'City',
    name: provider.location,
  }}),
});

export const podcastStructuredData = (podcast: {
  name: string;
  description: string;
  author: string;
  url: string;
  image?: string;
  episodeNumber?: number;
  duration?: string;
  datePublished: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'PodcastEpisode',
  name: podcast.name,
  description: podcast.description,
  author: {
    '@type': 'Person',
    name: podcast.author,
  },
  url: podcast.url,
  ...(podcast.image && {
    image: {
      '@type': 'ImageObject',
      url: podcast.image,
    },
  }),
  ...(podcast.episodeNumber && { episodeNumber: podcast.episodeNumber }),
  ...(podcast.duration && { duration: podcast.duration }),
  datePublished: podcast.datePublished,
});
