import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Alias URL for the Content Rights Ownership Agreement generator. */
export default function RightsAgreementAliasPage() {
  redirect('/agreement');
}
