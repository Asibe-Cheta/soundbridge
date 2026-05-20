import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Resources',
  description:
    'Courses, coaching & career tools from SoundBridge education partners. Sound Academy UK, Talk 2 Dan, and University of Hertfordshire.',
};

export default function ProResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
