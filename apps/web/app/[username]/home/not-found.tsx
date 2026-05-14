import Image from 'next/image';
import Link from 'next/link';
import { getSiteUrl } from '@/src/lib/site-url';

export default function FanLandingNotFound() {
  const origin = getSiteUrl();
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/images/logos/logo-trans-lockup.png"
        alt="SoundBridge"
        width={220}
        height={72}
        className="opacity-90"
        priority
      />
      <p className="mt-8 text-lg text-gray-200">This artist page isn&apos;t available.</p>
      <p className="mt-2 text-sm text-gray-500">Check the link or try again later.</p>
      <Link href={origin} className="mt-8 text-pink-400 hover:text-pink-300 underline text-sm">
        {origin.replace(/^https?:\/\//, '')}
      </Link>
    </div>
  );
}
