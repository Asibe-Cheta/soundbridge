export const CALENDLY_URL =
  'https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05';
export const TALK2DAN_URL = 'https://talk2dan.co.uk';
export const HERTS_URL = 'https://www.herts.ac.uk';

export const PRO_RESOURCES_IMAGES = {
  saLogo: '/images/pro-resources/sa-2.png',
  fund: '/images/pro-resources/fund.jpg',
  mix: '/images/pro-resources/mix.jpg',
  t2dLogo: '/images/pro-resources/T2Dhome.png',
  lockup: '/images/logos/logo-trans-lockup.png',
} as const;

export type ProResourcesTabId = 'sound-academy' | 'talk2dan' | 'herts';

export type CourseUnit = {
  number: number;
  title: string;
  topics: string[];
};

export type SoundAcademyModule = {
  id: string;
  moduleNumber: number;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  format: string;
  backgroundImage: string;
  overlayFrom: string;
  overlayTo: string;
  gradientFrom: string;
  gradientTo: string;
  ctaLabel: string;
  ctaUrl: string;
  certifications: string[];
  units: CourseUnit[];
};

export type Talk2DanService = {
  id: string;
  icon: 'people' | 'school' | 'tv' | 'briefcase';
  title: string;
  badge: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  ctaLabel: string;
};

export const PRO_RESOURCES_TABS: { id: ProResourcesTabId; label: string }[] = [
  { id: 'sound-academy', label: 'Sound Academy' },
  { id: 'talk2dan', label: 'Talk 2 Dan' },
  { id: 'herts', label: 'Herts Uni' },
];

export const SOUND_ACADEMY_STATS = [
  { value: '2,000+', label: 'Students Trained' },
  { value: '95%', label: 'Satisfaction' },
  { value: '75%', label: 'Employed in 3mo' },
  { value: '4.9/5', label: '580+ Reviews' },
] as const;

export const SOUND_ACADEMY_MODULES: SoundAcademyModule[] = [
  {
    id: 'sa-m1',
    moduleNumber: 1,
    title: 'Fundamentals of Recording & Mixing',
    subtitle: 'Beginner → Intermediate',
    description:
      'Master the foundations of professional audio production. Work hands-on with Pro Tools in a real studio — from initial setup through to your first premix.',
    duration: '1 month',
    format: 'Weekends · Sat & Sun · 10am–6pm',
    backgroundImage: PRO_RESOURCES_IMAGES.fund,
    overlayFrom: 'rgba(232,82,26,0.48)',
    overlayTo: 'rgba(201,32,117,0.48)',
    gradientFrom: '#E8521A',
    gradientTo: '#C92075',
    ctaLabel: 'Book an Appointment',
    ctaUrl: CALENDLY_URL,
    certifications: ['Avid Pro Tools PT101'],
    units: [
      {
        number: 1,
        title: 'Introduction to DAW & Pro Tools',
        topics: [
          'Overview of DAWs and why Pro Tools',
          'Basics of audio signal: frequency, amplitude, dynamics',
        ],
      },
      {
        number: 2,
        title: 'Studio Setup & Installation',
        topics: [
          'Connecting and optimising audio equipment',
          'Software settings: latency, buffer, sample rate',
        ],
      },
      {
        number: 3,
        title: 'Session Management & Project Organisation',
        topics: [
          'Creating and managing Pro Tools sessions & templates',
          'Input/output configuration, routing, and audio buses',
        ],
      },
      {
        number: 4,
        title: 'Recording Techniques',
        topics: [
          'Microphone selection and placement in the studio',
          'Take management and overdubbing (QuickPunch, Loop Record)',
        ],
      },
      {
        number: 5,
        title: 'Introduction to Audio Editing',
        topics: [
          'Basic editing tools (cut, trim, fade, grab)',
          'Organisation and management of audio clips & playlists',
        ],
      },
      {
        number: 6,
        title: 'First Steps in Mixing',
        topics: [
          'Signal flow, pre-/post-fader management',
          'Applying initial static balances',
        ],
      },
      {
        number: 7,
        title: 'MIDI Integration in Pro Tools',
        topics: [
          'Creating MIDI tracks and virtual instruments',
          'Timing management: Ticks vs Samples',
        ],
      },
      {
        number: 8,
        title: 'Review & Preparation for Premix',
        topics: [
          'Independent work on complete sessions',
          'Balancing & optimisation of the basic mix',
        ],
      },
    ],
  },
  {
    id: 'sa-m2',
    moduleNumber: 2,
    title: 'Advanced Mixing Techniques',
    subtitle: 'Intermediate → Professional',
    description:
      'Push into professional mixing, mastering, and Dolby Atmos. Finish with a portfolio-ready final project and your Pro Tools certifications.',
    duration: '1 month',
    format: 'Weekends · Sat & Sun · 10am–6pm',
    backgroundImage: PRO_RESOURCES_IMAGES.mix,
    overlayFrom: 'rgba(91,33,182,0.52)',
    overlayTo: 'rgba(201,32,117,0.52)',
    gradientFrom: '#5B21B6',
    gradientTo: '#C92075',
    ctaLabel: 'Book an Appointment',
    ctaUrl: CALENDLY_URL,
    certifications: ['Avid Pro Tools PT101', 'Avid Pro Tools PT110', 'Dolby Atmos'],
    units: [
      {
        number: 9,
        title: 'Advanced Mixing',
        topics: [
          'Stereo placement, level management & advanced automation',
          'Advanced equalisation & compression',
        ],
      },
      {
        number: 10,
        title: 'Advanced Processing & Effects',
        topics: [
          'Mastery of reverb, delay, saturation & spatial effects',
          'Effect automation for greater dynamics',
        ],
      },
      {
        number: 11,
        title: 'Using VST Plugins',
        topics: [
          'Native vs third-party plugins, CPU optimisation',
          'Parameter automation for a smoother workflow',
        ],
      },
      {
        number: 12,
        title: 'Professional Mix Organisation',
        topics: [
          'Gain staging, routing & complex track management',
          'CPU optimisation and final project preparation',
        ],
      },
      {
        number: 13,
        title: 'Advanced Mastering',
        topics: [
          'Normalisation, EQ & compression techniques',
          'Introduction to mastering with iZotope Ozone',
        ],
      },
      {
        number: 14,
        title: 'Case Studies & Real-World Projects',
        topics: [
          'Applying techniques across different musical styles',
          'Mix correction and refinement',
        ],
      },
      {
        number: 15,
        title: 'Project Management & Final Export',
        topics: [
          'Exporting for digital, vinyl, and streaming formats',
          'Project documentation and archiving',
        ],
      },
      {
        number: 16,
        title: 'Certification & Validation of Skills',
        topics: [
          'Comprehensive review before the exam',
          'Preparation for Pro Tools PT101 & PT110 certification',
        ],
      },
    ],
  },
];

export const TALK2DAN_SERVICES: Talk2DanService[] = [
  {
    id: 't2d-1',
    icon: 'people',
    title: 'Young People',
    badge: 'AGES 16–25',
    description:
      'Helping young people break into creative and media industries. Practical guidance from someone who has lived it.',
    gradientFrom: '#064E3B',
    gradientTo: '#065F46',
    ctaLabel: 'Get Started',
  },
  {
    id: 't2d-2',
    icon: 'school',
    title: 'Universities & Colleges',
    badge: 'ACADEMIC PARTNERSHIPS',
    description:
      'Bridging institutions and media employers to create clear pathways for students entering the industry.',
    gradientFrom: '#1E3A5F',
    gradientTo: '#1D4ED8',
    ctaLabel: 'Partner With Us',
  },
  {
    id: 't2d-3',
    icon: 'tv',
    title: 'Media Companies',
    badge: 'INDUSTRY CONSULTANCY',
    description:
      'Connecting companies with emerging talent. Dan has placed candidates at Sky, ITV, Channel 4 and more.',
    gradientFrom: '#3B0764',
    gradientTo: '#6D28D9',
    ctaLabel: 'Work With Us',
  },
  {
    id: 't2d-4',
    icon: 'briefcase',
    title: 'Recruitment',
    badge: 'END-TO-END PLACEMENT',
    description:
      'Full recruitment support for creative and media roles — matching the right talent with the right opportunity.',
    gradientFrom: '#422006',
    gradientTo: '#B45309',
    ctaLabel: 'Find Talent',
  },
];

export function getSoundAcademyModule(id: string): SoundAcademyModule | undefined {
  return SOUND_ACADEMY_MODULES.find((m) => m.id === id);
}
