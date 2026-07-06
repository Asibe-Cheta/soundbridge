import { createBrowserClient } from '@/src/lib/supabase';

export type ProResourceEventType = 'screen_view' | 'resource_tap' | 'explore_courses_tap';

export type ProResourceKey =
  | 'sa_module_1'
  | 'sa_module_2'
  | 'sa_booking'
  | 'ari_module_1'
  | 'ari_module_2'
  | 'ari_module_3'
  | 'ari_module_4'
  | 'ari_apply'
  | 'ari_enquiry'
  | 't2d_t2d-1'
  | 't2d_t2d-2'
  | 't2d_t2d-3'
  | 't2d_t2d-4'
  | 't2d_website'
  | 'herts_website'
  | 'mbg_distribute';

/** Exact partner_name values stored in partner_resource_clicks (mobile parity). */
export const PARTNER_RESOURCE_NAMES = [
  'Sound Academy',
  'Abbey Road Institute',
  'Talk2Dan',
  'University of Hertfordshire',
  'MBG Sonics',
] as const;

export type PartnerResourceName = (typeof PARTNER_RESOURCE_NAMES)[number];

export const PRO_RESOURCE_LABELS: Record<string, string> = {
  screen_view: 'Screen views',
  explore_courses_tap: 'Explore Courses (feed banner)',
  sa_module_1: 'SA Module 1',
  sa_module_2: 'SA Module 2',
  sa_booking: 'SA Booking',
  ari_module_1: 'ARI Course 1',
  ari_module_2: 'ARI Course 2',
  ari_module_3: 'ARI Course 3',
  ari_module_4: 'ARI Course 4',
  ari_apply: 'ARI Apply Now',
  ari_enquiry: 'ARI Enquiry',
  't2d_t2d-1': 'Talk 2 Dan — Young People',
  't2d_t2d-2': 'Talk 2 Dan — Universities & Colleges',
  't2d_t2d-3': 'Talk 2 Dan — Media Companies',
  't2d_t2d-4': 'Talk 2 Dan — Recruitment',
  t2d_website: 'Talk 2 Dan website',
  herts_website: 'University of Hertfordshire',
  mbg_distribute: 'MBG Sonics — Distribute My Music',
};

export function soundAcademyModuleResource(moduleId: string): ProResourceKey {
  if (moduleId === 'sa-m1') return 'sa_module_1';
  if (moduleId === 'sa-m2') return 'sa_module_2';
  return `sa_module_${moduleId}` as ProResourceKey;
}

export function abbeyRoadModuleResource(moduleId: string): ProResourceKey {
  if (moduleId === 'ari-m1') return 'ari_module_1';
  if (moduleId === 'ari-m2') return 'ari_module_2';
  if (moduleId === 'ari-m3') return 'ari_module_3';
  if (moduleId === 'ari-m4') return 'ari_module_4';
  return `ari_module_${moduleId}` as ProResourceKey;
}

export function talk2DanServiceResource(serviceId: string): ProResourceKey {
  return `t2d_${serviceId}` as ProResourceKey;
}

/** Fire-and-forget — never surface errors to the user. */
export async function trackProResource(
  eventType: ProResourceEventType,
  resource: ProResourceKey | null = null,
): Promise<void> {
  try {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('pro_resource_events').insert({
      user_id: user.id,
      event_type: eventType,
      resource,
    });
  } catch {
    /* non-blocking */
  }
}

/** Partner attribution click — written alongside pro_resource_events on card taps. */
export async function trackPartnerResourceClick(partnerName: PartnerResourceName): Promise<void> {
  try {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('partner_resource_clicks').insert({
      user_id: user.id,
      partner_name: partnerName,
    });
  } catch {
    /* non-blocking */
  }
}

export function trackPartnerResourceTap(
  eventType: ProResourceEventType,
  resource: ProResourceKey | null,
  partnerName: PartnerResourceName,
): void {
  void trackProResource(eventType, resource);
  void trackPartnerResourceClick(partnerName);
}
