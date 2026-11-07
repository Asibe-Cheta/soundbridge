import React from 'react';
import Image from 'next/image';

export type InstitutionBadgeId =
  | 'abbey_road_institute'
  | 'sound_academy'
  | 'logic_church'
  | 'gateway_international'
  | 'access_creative_london'
  | 'university_of_bedfordshire'
  | 'premier_gospel_uk';

// Note: access_creative_london / university_of_bedfordshire / premier_gospel_uk
// intentionally have no entry here — no badge artwork exists for them yet.
// InstitutionBadge below safely renders nothing for any id without an asset.
const BADGE_ASSETS: Partial<Record<InstitutionBadgeId, { src: string; label: string }>> = {
  abbey_road_institute: { src: '/images/badges/abb-badge.png', label: 'Abbey Road Institute' },
  sound_academy: { src: '/images/badges/sa-2.png', label: 'Sound Academy' },
  logic_church: { src: '/images/badges/LG.png', label: 'Logic Church' },
  gateway_international: { src: '/images/badges/GIC.png', label: 'Gateway International Church' },
};

export const INSTITUTION_BADGE_OPTIONS: { value: InstitutionBadgeId; label: string }[] = [
  { value: 'abbey_road_institute', label: 'Abbey Road Institute' },
  { value: 'sound_academy', label: 'Sound Academy' },
  { value: 'logic_church', label: 'Logic Church' },
  { value: 'gateway_international', label: 'Gateway International Church' },
  { value: 'access_creative_london', label: 'Access Creative London' },
  { value: 'university_of_bedfordshire', label: 'University of Bedfordshire' },
  { value: 'premier_gospel_uk', label: 'Premier Gospel UK' },
];

interface InstitutionBadgeProps {
  institutionBadge?: string | null;
  size?: number;
  className?: string;
}

export function InstitutionBadge({ institutionBadge, size = 18, className = '' }: InstitutionBadgeProps) {
  const asset = institutionBadge ? BADGE_ASSETS[institutionBadge as InstitutionBadgeId] : undefined;
  if (!asset) return null;

  const { src, label } = asset;

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
