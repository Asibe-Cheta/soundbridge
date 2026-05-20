'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  ExternalLink,
  GraduationCap,
  Hourglass,
  List,
  MessageCircle,
  Monitor,
  Users,
} from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  CALENDLY_URL,
  HERTS_URL,
  PRO_RESOURCES_IMAGES,
  PRO_RESOURCES_TABS,
  SOUND_ACADEMY_MODULES,
  SOUND_ACADEMY_STATS,
  TALK2DAN_SERVICES,
  TALK2DAN_URL,
  type ProResourcesTabId,
  type SoundAcademyModule,
  type Talk2DanService,
} from '@/src/content/pro-resources/data';

function textSecondary(theme: string) {
  return theme === 'dark' ? 'text-white/55' : 'text-gray-600';
}

function cardBorder(theme: string) {
  return theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200';
}

function cardBg(theme: string) {
  return theme === 'dark' ? 'bg-white/[0.05]' : 'bg-white';
}

export function ProResourcesBackButton({ onGradient = false }: { onGradient?: boolean }) {
  const router = useRouter();
  const { theme } = useTheme();
  const color = onGradient
    ? 'text-white'
    : theme === 'dark'
      ? 'text-white'
      : 'text-gray-900';
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`p-2 -ml-2 hover:opacity-80 transition-opacity ${color}`}
      aria-label="Go back"
    >
      <ChevronLeft size={24} />
    </button>
  );
}

export function PartnerBadge({
  dotColor,
  badgeBg,
  badgeBorder,
  textColor,
  label,
  children,
}: {
  dotColor: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-6">
      {children}
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-badge font-bold tracking-[0.8px]"
        style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: textColor }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
        {label}
      </span>
    </div>
  );
}

export function ProResourcesTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ProResourcesTabId;
  onTabChange: (tab: ProResourcesTabId) => void;
}) {
  const { theme } = useTheme();
  return (
    <div className="overflow-x-auto px-6 pb-8 scrollbar-none">
      <div className="flex gap-12 min-w-max">
        {PRO_RESOURCES_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`text-section-tab whitespace-nowrap transition-colors ${
                isActive
                  ? `font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`
                  : `font-normal ${theme === 'dark' ? 'text-white/35' : 'text-gray-400'}`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function t2dIcon(icon: Talk2DanService['icon']) {
  const props = { size: 40, className: 'text-white/25' };
  switch (icon) {
    case 'people':
      return <Users {...props} />;
    case 'school':
      return <GraduationCap {...props} />;
    case 'tv':
      return <Monitor {...props} />;
    case 'briefcase':
      return <Briefcase {...props} />;
  }
}

export function ModuleCard({ mod, href }: { mod: SoundAcademyModule; href: string }) {
  return (
    <Link
      href={href}
      className="relative shrink-0 w-[280px] h-[380px] rounded-3xl overflow-hidden mr-4 block no-underline"
    >
      <Image src={mod.backgroundImage} alt="" fill className="object-cover" sizes="280px" />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${mod.overlayFrom}, ${mod.overlayTo})`,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(0,0,0,0.35), rgba(0,0,0,0.82))',
        }}
      />
      <span className="absolute top-4 left-4 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-badge font-bold tracking-[1.2px] text-white">
        MODULE {mod.moduleNumber}
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-2xl font-bold text-white tracking-[-0.5px] mb-1">{mod.title}</h3>
        <p className="text-sm text-white/70 mb-3">{mod.subtitle}</p>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <List size={14} />
          <span>{mod.units.length} units</span>
          <span>·</span>
          <Award size={14} />
          <span>
            {mod.certifications.length} cert{mod.certifications.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Talk2DanCard({ service }: { service: Talk2DanService }) {
  return (
    <a
      href={TALK2DAN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative shrink-0 w-[280px] h-[380px] rounded-3xl overflow-hidden mr-4 block no-underline"
      style={{
        background: `linear-gradient(135deg, ${service.gradientFrom}, ${service.gradientTo})`,
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(0,0,0,0.35), rgba(0,0,0,0.82))',
        }}
      />
      <span className="absolute top-4 left-4 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-badge font-bold tracking-[1.2px] text-white">
        {service.badge}
      </span>
      <div className="absolute left-1/2 -translate-x-1/2 top-[30%]">{t2dIcon(service.icon)}</div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-2xl font-bold text-white tracking-[-0.5px] mb-2">{service.title}</h3>
        <p className="text-sm text-white/70 line-clamp-3 mb-3">{service.description}</p>
        <p className="text-xs text-white/55">{service.ctaLabel} →</p>
      </div>
    </a>
  );
}

export function HorizontalCardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex overflow-x-auto pb-2 pl-6 scrollbar-thin scrollbar-thumb-pink-500/50">
      {children}
      <div className="w-2 shrink-0" />
    </div>
  );
}

export function StatsGrid() {
  const { theme } = useTheme();
  return (
    <div className="px-6 mt-8">
      <h4 className={`mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>By the Numbers</h4>
      <div className="flex flex-wrap gap-2.5">
        {SOUND_ACADEMY_STATS.map((stat) => (
          <div
            key={stat.label}
            className={`w-[calc(50%-5px)] rounded-2xl border p-4 text-center ${cardBorder(theme)} ${cardBg(theme)}`}
          >
            <div className="text-2xl font-bold text-[#EC4899]">{stat.value}</div>
            <div className={`text-xs font-medium mt-1 ${textSecondary(theme)}`}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GradientCtaButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-6 mt-7 flex items-center justify-center gap-2 rounded-[32px] py-[15px] text-base font-bold text-white no-underline"
      style={{ background: 'linear-gradient(to right, #DC2626, #EC4899)' }}
    >
      {icon}
      {label}
    </a>
  );
}

export function SolidCtaButton({
  href,
  label,
  bg,
  icon,
}: {
  href: string;
  label: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-6 mt-7 flex items-center justify-center gap-2 rounded-[32px] py-[15px] text-base font-bold text-white no-underline"
      style={{ background: bg }}
    >
      {icon}
      {label}
    </a>
  );
}

export function OutlineCtaButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { theme } = useTheme();
  const primary = theme === 'dark' ? 'text-[#EC4899] border-[#EC4899]' : 'text-pink-600 border-pink-600';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`mx-6 mt-7 flex items-center justify-center gap-2 rounded-[32px] py-[15px] text-base font-bold border bg-transparent no-underline ${primary}`}
    >
      <ExternalLink size={18} />
      {label}
    </a>
  );
}

export function SoundAcademyTab() {
  const { theme } = useTheme();
  return (
    <>
      <PartnerBadge
        dotColor="#A78BFA"
        badgeBg="rgba(139,92,246,0.15)"
        badgeBorder="rgba(139,92,246,0.35)"
        textColor="#C4B5FD"
        label="EDUCATION PARTNER · UK"
      >
        <Image
          src={PRO_RESOURCES_IMAGES.saLogo}
          alt="Sound Academy"
          width={40}
          height={40}
          className="rounded-[10px]"
        />
      </PartnerBadge>

      <div className="px-6 mt-6">
        <h4 className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Sound Engineering</h4>
        <p className={`text-sm mt-1 mb-4 ${textSecondary(theme)}`}>
          2-month programme · Weekends · Official Avid Learning Partner
        </p>
      </div>

      <HorizontalCardRow>
        {SOUND_ACADEMY_MODULES.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} href={`/pro-resources/course/${mod.id}`} />
        ))}
      </HorizontalCardRow>

      <StatsGrid />

      <GradientCtaButton
        href={CALENDLY_URL}
        label="Book a Free Appointment"
        icon={<Calendar size={18} className="text-white" />}
      />
    </>
  );
}

export function Talk2DanTab() {
  const { theme } = useTheme();
  return (
    <>
      <PartnerBadge
        dotColor="#34D399"
        badgeBg="rgba(16,185,129,0.12)"
        badgeBorder="rgba(16,185,129,0.3)"
        textColor="#6EE7B7"
        label="INDUSTRY PARTNER · UK"
      >
        <Image
          src={PRO_RESOURCES_IMAGES.t2dLogo}
          alt="Talk 2 Dan"
          width={40}
          height={40}
          className="rounded-[10px]"
        />
      </PartnerBadge>

      <div className="px-6 mt-7">
        <h4 className={`mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>About Dan</h4>
        <p className={textSecondary(theme)}>
          Dan founded Talk 2 Dan in 2017 from personal experience navigating the barriers of breaking
          into the creative industry. With a background spanning{' '}
          <strong className={theme === 'dark' ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
            Sky, ITV, Channel 4
          </strong>{' '}
          and independent production companies, he bridges the gap between young talent and employers.
        </p>
      </div>

      <div className="px-6 mt-7">
        <h4 className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Services</h4>
      </div>

      <HorizontalCardRow>
        {TALK2DAN_SERVICES.map((s) => (
          <Talk2DanCard key={s.id} service={s} />
        ))}
      </HorizontalCardRow>

      <SolidCtaButton
        href={TALK2DAN_URL}
        label="Talk 2 Dan"
        bg="#059669"
        icon={<MessageCircle size={18} className="text-white" />}
      />
    </>
  );
}

export function HertsUniTab() {
  const { theme } = useTheme();
  return (
    <>
      <PartnerBadge
        dotColor="#93C5FD"
        badgeBg="rgba(96,165,250,0.12)"
        badgeBorder="rgba(96,165,250,0.3)"
        textColor="#BFDBFE"
        label="ACADEMIC PARTNER · UK"
      >
        <div className="w-10 h-10 rounded-[10px] bg-[#111] border border-white/10 flex items-center justify-center">
          <span className="text-xs font-extrabold text-[#60A5FA] tracking-[0.5px]">UH</span>
        </div>
      </PartnerBadge>

      <div className="px-6 mt-7 mb-8">
        <h4 className={`mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Coming Soon</h4>
        <p className={textSecondary(theme)}>
          We&apos;re finalising our partnership with the University of Hertfordshire. Course listings,
          degree details, and application pathways will appear here once the partnership is confirmed.
        </p>
      </div>

      <div className="px-6">
        <div
          className={`w-[280px] h-[380px] rounded-3xl border flex flex-col items-center justify-center mx-auto ${cardBorder(theme)} ${
            theme === 'dark' ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
          }`}
        >
          <Hourglass size={48} className="text-[#EC4899]" />
          <h3
            className={`text-2xl font-bold text-center mt-4 whitespace-pre-line ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Content{'\n'}Coming Soon
          </h3>
          <p className={`text-sm text-center mt-2 ${textSecondary(theme)}`}>
            University of Hertfordshire
          </p>
        </div>
      </div>

      <OutlineCtaButton href={HERTS_URL} label="Visit herts.ac.uk" />
    </>
  );
}
