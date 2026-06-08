'use client';

import Image from 'next/image';

type HomepagePartnersSectionProps = {
  userCountRounded: number;
  isDark: boolean;
};

const PARTNERS = [
  {
    name: 'Sound Academy UK',
    descriptor: 'Official student access partner',
    src: '/images/partners/sa-2.png',
    type: 'image' as const,
  },
  {
    name: 'University of Bedfordshire',
    descriptor: 'Campus speaking and partnership programme',
    type: 'text' as const,
  },
  {
    name: 'Talk 2 Dan Media',
    descriptor: 'Creative industry event partnership',
    src: '/images/partners/T2Dhome.png',
    type: 'image' as const,
  },
  {
    name: 'Radio LaB 97.1FM',
    descriptor: 'Official broadcasting partner',
    src: '/images/partners/beds-fm.png',
    type: 'image' as const,
  },
];

export function HomepagePartnersSection({ userCountRounded, isDark }: HomepagePartnersSectionProps) {
  const statLabel =
    userCountRounded > 0
      ? `${userCountRounded.toLocaleString()}+ users across the UK, Nigeria, Ghana and beyond`
      : 'Users across the UK, Nigeria, Ghana and beyond';

  return (
    <section className="mb-16" aria-labelledby="partners-heading">
      <div
        className={`rounded-2xl border px-6 py-8 sm:px-10 sm:py-10 ${
          isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
        }`}
      >
        <h2
          id="partners-heading"
          className={`text-center text-lg font-semibold sm:text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          Trusted by creators and institutions across the UK and beyond
        </h2>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8 lg:gap-x-10">
          {PARTNERS.map((partner) => (
            <li key={partner.name} className="flex flex-col items-center text-center">
              {partner.type === 'image' ? (
                <div className="relative h-12 w-[120px] sm:h-14 sm:w-[140px]">
                  <Image
                    src={partner.src}
                    alt={partner.name}
                    fill
                    className="object-contain object-center"
                    sizes="140px"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={`flex h-12 min-h-[3rem] w-[120px] max-w-[140px] flex-col items-center justify-center sm:h-14 ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}
                  aria-label={partner.name}
                >
                  <span className="text-xs font-semibold leading-snug tracking-wide sm:text-sm">
                    University of
                    <br />
                    Bedfordshire
                  </span>
                </div>
              )}
              <p
                className={`mt-3 max-w-[160px] text-[11px] leading-snug sm:text-xs ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {partner.descriptor}
              </p>
            </li>
          ))}
        </ul>

        <p className={`mt-10 text-center text-base font-medium sm:text-lg ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {statLabel}
        </p>

        <p className={`mt-3 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Launched April 2026. Growing entirely organically. No paid acquisition.
        </p>
      </div>
    </section>
  );
}
