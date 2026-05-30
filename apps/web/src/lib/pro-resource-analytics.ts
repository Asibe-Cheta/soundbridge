import { createBrowserClient } from '@/src/lib/supabase';

export type ProResourceEventType = 'screen_view' | 'resource_tap';

export type ProResourceKey =
  | 'sa_module_1'
  | 'sa_module_2'
  | 'sa_booking'
  | 't2d_t2d-1'
  | 't2d_t2d-2'
  | 't2d_t2d-3'
  | 't2d_t2d-4'
  | 't2d_website'
  | 'herts_website';

export const PRO_RESOURCE_LABELS: Record<string, string> = {
  screen_view: 'Screen views',
  sa_module_1: 'SA Module 1',
  sa_module_2: 'SA Module 2',
  sa_booking: 'SA Booking',
  't2d_t2d-1': 'Talk 2 Dan — Young People',
  't2d_t2d-2': 'Talk 2 Dan — Universities & Colleges',
  't2d_t2d-3': 'Talk 2 Dan — Media Companies',
  't2d_t2d-4': 'Talk 2 Dan — Recruitment',
  t2d_website: 'Talk 2 Dan website',
  herts_website: 'University of Hertfordshire',
};

export function soundAcademyModuleResource(moduleId: string): ProResourceKey {
  if (moduleId === 'sa-m1') return 'sa_module_1';
  if (moduleId === 'sa-m2') return 'sa_module_2';
  return `sa_module_${moduleId}` as ProResourceKey;
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
