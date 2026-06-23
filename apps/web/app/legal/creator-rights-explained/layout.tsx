import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Creator Rights Explained',
  description:
    'Plain-language summary of content ownership, hosting, distribution, tips, and creator rights on SoundBridge — for creators and legal review.',
  alternates: {
    canonical: 'https://www.soundbridge.live/legal/creator-rights-explained',
  },
};

export default function CreatorRightsExplainedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
