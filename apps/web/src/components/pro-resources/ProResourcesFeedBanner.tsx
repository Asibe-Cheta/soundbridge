'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRO_RESOURCES_IMAGES } from '@/src/content/pro-resources/data';
import { trackProResource } from '@/src/lib/pro-resource-analytics';

const AUTO_MS = 3000;
const SLIDE_COUNT = 2;

function PartnerLogo({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={52}
      height={52}
      className="rounded-xl shrink-0"
      onError={() => setHidden(true)}
    />
  );
}

function SoundAcademySlide() {
  return (
    <Link
      href="/pro-resources"
      className="block h-full rounded-[20px] border border-[rgba(139,92,246,0.25)] overflow-hidden shadow-[0_6px_16px_rgba(124,58,237,0.3)] no-underline"
      style={{
        background:
          'linear-gradient(135deg, #1C1235 0%, #2A1650 50%, #1C1235 100%), linear-gradient(135deg, rgba(139,92,246,0.18) 0%, transparent 50%, rgba(88,28,135,0.12) 100%)',
        backgroundBlendMode: 'normal, overlay',
      }}
    >
      <div className="pt-3.5 px-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <PartnerLogo src={PRO_RESOURCES_IMAGES.saLogo} alt="Sound Academy" />
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

function AbbeyRoadSlide() {
  return (
    <Link
      href="/pro-resources?tab=abbey-road"
      className="block h-full rounded-[20px] border border-[rgba(220,38,38,0.25)] overflow-hidden shadow-[0_6px_16px_rgba(153,27,27,0.3)] no-underline"
      style={{
        background:
          'linear-gradient(135deg, #1C0A0A 0%, #2A1010 50%, #1C0808 100%), linear-gradient(135deg, rgba(220,38,38,0.18) 0%, transparent 50%, rgba(153,27,27,0.12) 100%)',
        backgroundBlendMode: 'normal, overlay',
      }}
    >
      <div className="pt-3.5 px-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <PartnerLogo src={PRO_RESOURCES_IMAGES.ariLogo} alt="Abbey Road Institute" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(220,38,38,0.4)] bg-[rgba(220,38,38,0.2)] px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5]" />
            <span className="text-badge font-bold tracking-[0.8px] text-[#FCA5A5]">
              EDUCATION PARTNER
            </span>
          </span>
        </div>

        <h3 className="text-white text-xl font-bold tracking-[0.1px] mt-3 mb-1.5">
          Train at Abbey Road
        </h3>
        <p className="text-sm leading-[19px] text-white/55 mb-3.5">
          Pro audio engineering in a world-famous studio. Avid certified · Weekend & intensive
          programmes.
        </p>

        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white mb-3.5">
          <GraduationCap size={16} />
          Explore Programmes
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

const SLIDES = [<SoundAcademySlide key="sa" />, <AbbeyRoadSlide key="ari" />];

export function ProResourcesFeedBanner() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDE_COUNT);
    }, AUTO_MS);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const goTo = (next: number) => {
    setIndex(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
    resetTimer();
  };

  const handleSwipeEnd = (deltaX: number) => {
    if (Math.abs(deltaX) < 40) return;
    goTo(deltaX < 0 ? index + 1 : index - 1);
  };

  return (
    <div className="mx-4 mt-3 mb-1">
      <div
        className="overflow-hidden touch-pan-y select-none"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current == null) return;
          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
          handleSwipeEnd(endX - touchStartX.current);
          touchStartX.current = null;
        }}
        onMouseDown={(event) => {
          dragStartX.current = event.clientX;
        }}
        onMouseUp={(event) => {
          if (dragStartX.current == null) return;
          handleSwipeEnd(event.clientX - dragStartX.current);
          dragStartX.current = null;
        }}
        onMouseLeave={() => {
          dragStartX.current = null;
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, slideIndex) => (
            <div key={slideIndex} className="w-full shrink-0">
              {slide}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-2.5">
        {Array.from({ length: SLIDE_COUNT }).map((_, dotIndex) => {
          const active = dotIndex === index;
          return (
            <button
              key={dotIndex}
              type="button"
              aria-label={`Show banner ${dotIndex + 1}`}
              onClick={() => goTo(dotIndex)}
              className={`h-1.5 rounded-full transition-all ${
                active ? 'w-5 bg-white/80' : 'w-1.5 bg-white/30'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
