import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export type UserPreferences = {
  preferred_event_distance?: number;
  preferred_genres?: string[];
  preferred_city?: string;
  preferred_country?: string;
  preferred_locations?: string[];
};

type PreferencesResponse = {
  success: boolean;
  preferences?: UserPreferences;
  message?: string;
};

export async function getUserPreferences(userId: string, session: Session | null): Promise<UserPreferences | null> {
  if (!userId || !session?.access_token) {
    return null;
  }

  try {
    const data = await apiFetch<PreferencesResponse>(`/api/users/${userId}/preferences`, {
      method: 'GET',
      session,
    });

    if (!data.success) {
      return null;
    }

    const prefs = data.preferences || {};

    return {
      ...prefs,
      preferred_genres: normalizeArray(prefs.preferred_genres),
      preferred_locations: normalizeArray(prefs.preferred_locations),
    };
  } catch (error) {
    console.warn('UserPreferencesService: failed to load preferences', error);
    return null;
  }
}

function normalizeArray(value?: string[] | string | null): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return [value];
  return undefined;
}



