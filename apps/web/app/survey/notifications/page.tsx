import type { Metadata } from 'next';
import { getSiteUrl } from '@/src/lib/site-url';
import { SurveyNotificationsClient } from './SurveyNotificationsClient';

const SITE_URL = getSiteUrl();
const TITLE = 'Quick survey — SoundBridge';
const DESCRIPTION = 'Help shape SoundBridge. 7 quick questions, about 2 minutes. Your answers are anonymous.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/survey/notifications` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/survey/notifications`,
    siteName: 'SoundBridge',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SoundBridge',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/og-image.jpg'],
  },
};

export default function SurveyNotificationsPage() {
  return <SurveyNotificationsClient />;
}
