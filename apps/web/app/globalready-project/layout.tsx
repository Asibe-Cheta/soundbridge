import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Ready Project',
  description: 'Authorised upfront payment for Global Ready web application project.',
  robots: { index: false, follow: false },
};

export default function GlobalReadyProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
