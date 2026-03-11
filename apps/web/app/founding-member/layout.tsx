import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founding Member | SoundBridge',
  description: 'Confirm your Founding Member status. You were one of the first 100 on the SoundBridge waitlist.',
};

export default function FoundingMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
