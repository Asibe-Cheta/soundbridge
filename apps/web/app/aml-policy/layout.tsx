import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anti-Money Laundering Policy | SoundBridge',
  description:
    'SoundBridge Live Ltd Anti-Money Laundering (AML) policy — customer due diligence, transaction monitoring, and suspicious activity reporting.',
  alternates: {
    canonical: 'https://soundbridge.live/aml-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AmlPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
