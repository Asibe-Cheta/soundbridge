import type { Metadata } from 'next';
import { SignAgreementClient } from './SignAgreementClient';

export const metadata: Metadata = {
  title: 'Partnership agreement',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignAgreementPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <SignAgreementClient token={token} />
      </div>
    </div>
  );
}
