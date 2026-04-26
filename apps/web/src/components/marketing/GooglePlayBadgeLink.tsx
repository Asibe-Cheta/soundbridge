import { ANDROID_PLAY_STORE_URL } from '@/src/lib/app-store-url';
import { AppStoreBadgeSize } from '@/src/components/marketing/AppStoreBadgeLink';

const SIZE_CLASS: Record<AppStoreBadgeSize, string> = {
  sm: 'h-9 w-auto sm:h-10',
  md: 'h-10 w-auto sm:h-11',
  lg: 'h-11 w-auto sm:h-12 md:h-14',
};

type Props = {
  size?: AppStoreBadgeSize;
  className?: string;
};

/**
 * Google Play badge (`/images/logos/google-play.svg`).
 * Keep aspect ratio via height + `w-auto`.
 */
export function GooglePlayBadgeLink({ size = 'md', className = '' }: Props) {
  return (
    <a
      href={ANDROID_PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${className}`}
      aria-label="Get it on Google Play"
    >
      <img
        src="/images/logos/google-play.svg"
        alt="Get it on Google Play"
        width={180}
        height={53}
        className={`${SIZE_CLASS[size]} max-w-full`}
        decoding="async"
      />
    </a>
  );
}
