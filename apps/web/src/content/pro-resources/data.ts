export const CALENDLY_URL =
  'https://calendly.com/soundacademyen/meet-with-sound-academy?back=1&month=2026-05';
export const ABBEY_ROAD_URL = 'https://abbeyroadinstitute.co.uk';
export const ABBEY_ROAD_COURSES_URL = 'https://abbeyroadinstitute.co.uk/courses';
export const ABBEY_ROAD_APPLY_URL =
  'https://abbeyroadinstitute.co.uk/category/events/#apply-now';
export const TALK2DAN_URL = 'https://talk2dan.co.uk';
export const HERTS_URL = 'https://www.herts.ac.uk';

export const PRO_RESOURCES_IMAGES = {
  saLogo: '/images/pro-resources/sa-2.png',
  ariLogo: '/images/pro-resources/abbey-logo.png',
  fund: '/images/pro-resources/fund.jpg',
  mix: '/images/pro-resources/mix.jpg',
  t2dLogo: '/images/pro-resources/T2Dhome.png',
  mbgLogo: '/images/pro-resources/mbg.png',
  lockup: '/images/logos/logo-trans-lockup.png',
} as const;

export type ProResourcesTabId = 'sound-academy' | 'abbey-road' | 'talk2dan' | 'herts' | 'mbg-sonics';

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
  { id: 'abbey-road', label: 'Abbey Road Inst.' },
  { id: 'talk2dan', label: 'Talk 2 Dan' },
  { id: 'herts', label: 'Herts Uni' },
  { id: 'mbg-sonics', label: 'MBG Sonics' },
];

export const INSTITUTIONAL_PARTNERS = [
  {
    id: 'sound_academy',
    name: 'Sound Academy',
    website: 'https://www.soundacademy.uk',
    logo: PRO_RESOURCES_IMAGES.saLogo,
    description:
      'Sound Academy delivers professional audio engineering and DJ training across the UK and internationally.',
    instagram: '@soundacademyuk',
    registrationUrl: CALENDLY_URL,
    joinPath: '/join/soundacademy',
  },
  {
    id: 'abbey_road_institute',
    name: 'Abbey Road Institute',
    website: ABBEY_ROAD_URL,
    logo: PRO_RESOURCES_IMAGES.ariLogo,
    description:
      'Abbey Road Institute delivers professional audio engineering and music production training inside leading professional studios. Their programmes are taught in small groups focused on real studio workflows and prepare students for Avid Pro Tools certifications.',
    instagram: '@abbeyroadinstitute',
    registrationUrl: ABBEY_ROAD_COURSES_URL,
    joinPath: '/join/abbeyroad',
  },
] as const;

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

export const ABBEY_ROAD_STATS = [
  { value: '30+', label: 'Years of Excellence' },
  { value: 'Grammy', label: 'Award-Winning Faculty' },
  { value: 'Abbey Road', label: 'Iconic Studio Access' },
  { value: 'Dolby', label: 'Atmos Certified' },
] as const;

export const ABBEY_ROAD_MODULES: SoundAcademyModule[] = [
  {
    id: 'ari-m1',
    moduleNumber: 1,
    title: 'Advanced Diploma in Music Production & Sound Engineering',
    subtitle: 'Full-Time · 1 Year',
    description:
      'Train at one of London\'s most iconic institutions. Master every stage of professional production — from signal chain and tracking to mixing, mastering and client management.',
    duration: '1 year',
    format: 'Full-Time',
    backgroundImage: '',
    overlayFrom: 'rgba(220,38,38,0.48)',
    overlayTo: 'rgba(127,29,29,0.48)',
    gradientFrom: '#DC2626',
    gradientTo: '#7F1D1D',
    ctaLabel: 'Apply Now',
    ctaUrl: ABBEY_ROAD_APPLY_URL,
    certifications: ['Advanced Diploma'],
    units: [
      { number: 1, title: 'Signal chain & tracking', topics: [] },
      { number: 2, title: 'Mixing', topics: [] },
      { number: 3, title: 'Mastering', topics: [] },
      { number: 4, title: 'Client management', topics: [] },
    ],
  },
  {
    id: 'ari-m2',
    moduleNumber: 2,
    title: 'Song Production Masterclass',
    subtitle: 'Intensive · 4 Days',
    description:
      'Record and mix a full song at Abbey Road Studios and Angel Studios alongside Grammy-winning engineer Ben Baptie (Lady Gaga, Radiohead, U2).',
    duration: '4 days',
    format: 'Intensive',
    backgroundImage: '',
    overlayFrom: 'rgba(153,27,27,0.52)',
    overlayTo: 'rgba(220,38,38,0.52)',
    gradientFrom: '#991B1B',
    gradientTo: '#DC2626',
    ctaLabel: 'Apply Now',
    ctaUrl: ABBEY_ROAD_APPLY_URL,
    certifications: ['Certificate of Completion'],
    units: [
      { number: 1, title: 'Recording', topics: [] },
      { number: 2, title: 'Editing', topics: [] },
      { number: 3, title: 'Mixing', topics: [] },
      { number: 4, title: 'Review', topics: [] },
    ],
  },
  {
    id: 'ari-m3',
    moduleNumber: 3,
    title: 'Dolby Atmos Mixing For Music',
    subtitle: 'Part-Time · 12 Weeks',
    description:
      'Learn immersive spatial audio mixing in a dedicated Dolby Atmos studio at Angel Studios. Led by Grammy-winning engineer James Auwarter.',
    duration: '12 weeks',
    format: 'Part-Time',
    backgroundImage: '',
    overlayFrom: 'rgba(127,29,29,0.52)',
    overlayTo: 'rgba(185,28,28,0.52)',
    gradientFrom: '#7F1D1D',
    gradientTo: '#B91C1C',
    ctaLabel: 'Apply Now',
    ctaUrl: ABBEY_ROAD_APPLY_URL,
    certifications: ['Dolby Atmos Certificate'],
    units: [
      { number: 1, title: 'Spatial audio fundamentals', topics: [] },
      { number: 2, title: 'Atmos mixing', topics: [] },
      { number: 3, title: 'Delivery & review', topics: [] },
    ],
  },
  {
    id: 'ari-m4',
    moduleNumber: 4,
    title: 'Advanced Diploma in Audio Post Production for Film & TV',
    subtitle: 'Part-Time · 5½ Months',
    description:
      'Specialise in professional audio for film and television. Build the practical skills and industry contacts to work on screen productions at the highest level.',
    duration: '5½ months',
    format: 'Part-Time',
    backgroundImage: '',
    overlayFrom: 'rgba(185,28,28,0.52)',
    overlayTo: 'rgba(153,27,27,0.52)',
    gradientFrom: '#B91C1C',
    gradientTo: '#991B1B',
    ctaLabel: 'Apply Now',
    ctaUrl: ABBEY_ROAD_APPLY_URL,
    certifications: ['Advanced Diploma'],
    units: [
      { number: 1, title: 'Post production workflow', topics: [] },
      { number: 2, title: 'Sound design for screen', topics: [] },
      { number: 3, title: 'Industry practice', topics: [] },
    ],
  },
];

export function getSoundAcademyModule(id: string): SoundAcademyModule | undefined {
  return SOUND_ACADEMY_MODULES.find((m) => m.id === id);
}

export function getAbbeyRoadModule(id: string): SoundAcademyModule | undefined {
  return ABBEY_ROAD_MODULES.find((m) => m.id === id);
}
