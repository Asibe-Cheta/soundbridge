import { redirect } from 'next/navigation';

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referralCode = ref?.trim();
  redirect(referralCode ? `/signup?ref=${encodeURIComponent(referralCode)}` : '/signup');
}
