/**
 * User availability API for Urgent Gigs (provider settings)
 * See w.md §3.2 and MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md
 */

import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import type { UserAvailability } from '@/src/lib/types/user-availability.types';

const API = '/api';

export async function getMyAvailability(): Promise<UserAvailability> {
  const res = await fetchWithAuth(`${API}/user/availability`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to load availability');
  }
  return json.data as UserAvailability;
}

export async function updateAvailability(
  data: Partial<UserAvailability>
): Promise<UserAvailability> {
  const res = await fetchWithAuth(`${API}/user/availability`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to update availability');
  }
  return json.data as UserAvailability;
}

export async function updateLocation(lat: number, lng: number): Promise<void> {
  const res = await fetchWithAuth(`${API}/user/availability/location`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}
