'use client';

import Image from 'next/image';

type HomepagePartnersSectionProps = {
  userCountRounded: number;
  isDark: boolean;
};

const PARTNERS = [
  {
    name: 'Sound Academy UK',
    src: '/images/partners/sa-2.png',
    type: 'image' as const,
  },
  {
    name: 'University of Bedfordshire',
    type: 'text' as const,
  },
  {
    name: 'Radio LaB 97.1FM',
    src: '/images/partners/beds-fm.png',
    type: 'image' as const,
  },
  {
    name: 'Talk 2 Dan Media',
    src: '/images/partners/T2Dhome.png',
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

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-10 lg:gap-12">
          {PARTNERS.map((partner) => (
            <li key={partner.name} className="flex shrink-0 items-center justify-center">
              {partner.type === 'image' ? (
                <div className="group relative h-12 w-[120px] sm:h-14 sm:w-[140px]">
                  <Image
                    src={partner.src}
                    alt={partner.name}
                    fill
                    className="object-contain object-center grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                    sizes="140px"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[140px] text-center text-xs font-semibold leading-snug tracking-wide transition-colors sm:text-sm ${
                    isDark
                      ? 'text-gray-400 group-hover:text-gray-200'
                      : 'text-gray-500'
                  }`}
                  aria-label={partner.name}
                >
                  University of
                  <br />
                  Bedfordshire
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className={`mt-8 text-center text-base font-medium sm:text-lg ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {statLabel}
        </p>

        <p className={`mt-3 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Launched April 2026. Growing entirely organically. No paid acquisition.
        </p>
      </div>
    </section>
  );
}
