import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fire-and-forget behaviour profile updates (mirrors mobile UserBehaviourService).
 * Errors are logged only — never surfaced to the user.
 */

function warn(context: string, error: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[UserBehaviour] ${context}`, error);
  }
}

export async function recordAppOpen(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_app_open', { p_user_id: userId });
    if (error) warn('recordAppOpen', error);
  } catch (e) {
    warn('recordAppOpen', e);
  }
}

export async function recordEventView(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  city?: string | null,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_event_view', {
      p_user_id: userId,
      p_event_id: eventId,
      p_city: city ?? null,
    });
    if (error) warn('recordEventView', error);
  } catch (e) {
    warn('recordEventView', e);
  }
}

export async function updatePrimaryCity(
  supabase: SupabaseClient,
  userId: string,
  city: string | null | undefined,
): Promise<void> {
  const trimmed = String(city ?? '').trim();
  if (!trimmed) return;

  try {
    const { error } = await supabase.rpc('update_user_behaviour_primary_city', {
      p_user_id: userId,
      p_city: trimmed,
    });
    if (error) warn('updatePrimaryCity', error);
  } catch (e) {
    warn('updatePrimaryCity', e);
  }
}
