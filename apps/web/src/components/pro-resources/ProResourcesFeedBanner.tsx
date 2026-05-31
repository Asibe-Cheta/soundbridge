'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { PRO_RESOURCES_IMAGES } from '@/src/content/pro-resources/data';
import { trackProResource } from '@/src/lib/pro-resource-analytics';

export function ProResourcesFeedBanner() {
  return (
    <Link
      href="/pro-resources"
      className="block mx-4 mt-3 mb-1 rounded-[20px] border border-[rgba(139,92,246,0.25)] overflow-hidden shadow-[0_6px_16px_rgba(124,58,237,0.3)] no-underline"
      style={{
        background:
          'linear-gradient(135deg, #1C1235 0%, #2A1650 50%, #1C1235 100%), linear-gradient(135deg, rgba(139,92,246,0.18) 0%, transparent 50%, rgba(88,28,135,0.12) 100%)',
        backgroundBlendMode: 'normal, overlay',
      }}
    >
      <div className="pt-3.5 px-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <Image
            src={PRO_RESOURCES_IMAGES.saLogo}
            alt="Sound Academy"
            width={52}
            height={52}
            className="rounded-xl shrink-0"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.2)] px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
            <span className="text-badge font-bold tracking-[0.8px] text-[#C4B5FD]">
              EDUCATION PARTNER
            </span>
          </span>
        </div>

        <h3 className="text-white text-xl font-bold tracking-[0.1px] mt-3 mb-1.5">
          Level Up Your Sound
        </h3>
        <p className="text-sm leading-[19px] text-white/55 mb-3.5 whitespace-pre-line">
          World-class audio engineering & DJ courses.{'\n'}Pro Tools certified · 5 countries.
        </p>

        <span
          role="presentation"
          onClick={() => void trackProResource('explore_courses_tap')}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white mb-3.5"
        >
          <GraduationCap size={16} />
          Explore Courses
        </span>

        <div className="flex items-center justify-between border-t border-white/[0.07] py-2.5">
          <span className="text-badge font-medium text-white/30">
            Official SoundBridge Education Partner
          </span>
          <Image
            src={PRO_RESOURCES_IMAGES.lockup}
            alt="SoundBridge"
            width={72}
            height={14}
            className="opacity-35 h-[14px] w-auto"
          />
        </div>
      </div>
    </Link>
  );
}
