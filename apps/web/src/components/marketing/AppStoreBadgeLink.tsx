import { IOS_APP_STORE_URL } from '@/src/lib/app-store-url';

const SIZE_CLASS = {
  /** Inline banners, tight rows (~36–40px tall) */
  sm: 'h-9 w-auto sm:h-10',
  /** Default CTAs (~40–44px tall) */
  md: 'h-10 w-auto sm:h-11',
  /** Hero / download page prominence (~44–56px tall) */
  lg: 'h-11 w-auto sm:h-12 md:h-14',
} as const;

export type AppStoreBadgeSize = keyof typeof SIZE_CLASS;

type Props = {
  size?: AppStoreBadgeSize;
  className?: string;
};

/**
 * Apple “Download on the App Store” badge (`/badges/app-store.svg`).
 * Official artwork: keep aspect ratio via height + w-auto.
 */
export function AppStoreBadgeLink({ size = 'md', className = '' }: Props) {
  return (
    <a
      href={IOS_APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${className}`}
      aria-label="Download on the App Store"
    >
      <img
        src="/badges/app-store.svg"
        alt="Download on the App Store"
        width={180}
        height={60}
        className={`${SIZE_CLASS[size]} max-w-full`}
        decoding="async"
      />
    </a>
  );
}
