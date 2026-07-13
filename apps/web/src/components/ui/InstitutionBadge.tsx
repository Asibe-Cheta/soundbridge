import React from 'react';
import Image from 'next/image';

export type InstitutionBadgeId = 'abbey_road_institute' | 'sound_academy';

const BADGE_ASSETS: Record<InstitutionBadgeId, { src: string; label: string }> = {
  abbey_road_institute: { src: '/images/badges/abb-badge.png', label: 'Abbey Road Institute' },
  sound_academy: { src: '/images/badges/sa-2.png', label: 'Sound Academy' },
};

export const INSTITUTION_BADGE_OPTIONS: { value: InstitutionBadgeId; label: string }[] = [
  { value: 'abbey_road_institute', label: 'Abbey Road Institute' },
  { value: 'sound_academy', label: 'Sound Academy' },
];

interface InstitutionBadgeProps {
  institutionBadge?: string | null;
  size?: number;
  className?: string;
}

export function InstitutionBadge({ institutionBadge, size = 18, className = '' }: InstitutionBadgeProps) {
  if (!institutionBadge || !(institutionBadge in BADGE_ASSETS)) return null;

  const { src, label } = BADGE_ASSETS[institutionBadge as InstitutionBadgeId];

  return (
    <Image
      src={src}
      alt={label}
      title={label}
      width={size}
      height={size}
      className={`inline-block object-contain align-middle ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
