'use client';

import { useState } from 'react';
import { Award, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import {
  GradientCtaButton,
  ProResourcesBackButton,
} from '@/src/components/pro-resources/ProResourcesUI';
import type { SoundAcademyModule } from '@/src/content/pro-resources/data';

export function CourseDetailClient({ mod }: { mod: SoundAcademyModule }) {
  const { theme } = useTheme();
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  const textSecondary = theme === 'dark' ? 'text-white/55' : 'text-gray-600';
  const cardBorder = theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200';
  const cardBg = theme === 'dark' ? 'bg-white/[0.05]' : 'bg-white';

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gray-50'
      }`}
    >
      <section
        className="px-6 pt-3 pb-7"
        style={{
          background: `linear-gradient(135deg, ${mod.gradientFrom}, ${mod.gradientTo})`,
        }}
      >
        <ProResourcesBackButton onGradient />
        <span className="inline-flex items-center rounded-xl border border-white/20 bg-white/12 px-2.5 py-1 text-[10px] font-bold tracking-[1.2px] text-white uppercase mt-5 mb-3">
          MODULE {mod.moduleNumber} · SOUND ACADEMY UK
        </span>
        <h1 className="text-[32px] font-bold text-white tracking-[-0.5px] leading-[38px] mb-1.5">
          {mod.title}
        </h1>
        <p className="text-[15px] text-white/70 mb-4">{mod.subtitle}</p>
        <div className="flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5">
            <Clock size={13} className="text-white/70" />
            <span className="text-xs font-medium text-white/75">{mod.duration}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5">
            <Calendar size={13} className="text-white/70" />
            <span className="text-xs font-medium text-white/75">{mod.format}</span>
          </span>
        </div>
      </section>

      <div className="px-6 pt-7 pb-10">
        <section className="mb-7">
          <h2
            className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            About this module
          </h2>
          <p className={`text-[15px] leading-[23px] ${textSecondary}`}>{mod.description}</p>
        </section>

        <section className="mb-7">
          <h2
            className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            Certifications Awarded
          </h2>
          <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${cardBorder} ${cardBg}`}>
            {mod.certifications.map((cert) => (
              <div key={cert} className="flex items-center gap-2.5">
                <Award size={16} className="text-amber-500 shrink-0" />
                <span
                  className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  {cert}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2
            className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            {mod.units.length} Units
          </h2>
          <div className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-gray-200'}`}>
            {mod.units.map((unit) => {
              const isOpen = expandedUnit === unit.number;
              return (
                <div key={unit.number} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedUnit(isOpen ? null : unit.number)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <span className="w-8 h-8 shrink-0 rounded-[10px] bg-[#EC4899]/20 flex items-center justify-center text-[13px] font-bold text-[#EC4899]">
                      {unit.number}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`text-[15px] font-semibold leading-[22px] block ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {unit.title}
                      </span>
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className={`shrink-0 mt-1 ${textSecondary}`} />
                    ) : (
                      <ChevronDown size={16} className={`shrink-0 mt-1 ${textSecondary}`} />
                    )}
                  </button>
                  {isOpen && (
                    <ul className="mt-2.5 ml-11 flex flex-col gap-1.5">
                      {unit.topics.map((topic) => (
                        <li key={topic} className="flex items-start gap-2">
                          <span className="w-[5px] h-[5px] rounded-full bg-[#EC4899] mt-2 shrink-0" />
                          <span className={`text-[13px] leading-[19px] ${textSecondary}`}>
                            {topic}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <GradientCtaButton
          href={mod.ctaUrl}
          label={mod.ctaLabel}
          icon={<Calendar size={18} className="text-white" />}
        />
        <p className={`text-center text-xs mt-3 ${textSecondary}`}>
          Free 30-min consultation · No obligation
        </p>
      </div>

      <Footer />
    </div>
  );
}
