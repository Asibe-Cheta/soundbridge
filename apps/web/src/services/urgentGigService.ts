/**
 * Urgent gig API service
 * See w.md §3.1 and MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md
 */

import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import type { UrgentGig, GigResponse } from '@/src/lib/types/urgent-gig.types';

const API = '/api';

export interface CreateUrgentGigInput {
  skill_required: string;
  date_needed: string;
  payment_amount: number;
  location_lat: number;
  location_lng: number;
  genre?: string[];
  duration_hours?: number;
  location_address?: string;
  location_radius_km?: number;
  payment_currency?: string;
  description?: string;
}

export interface CreateUrgentGigResult {
  gig_id: string;
  stripe_client_secret: string | null;
  estimated_matches: number;
}

export async function createUrgentGig(data: CreateUrgentGigInput): Promise<CreateUrgentGigResult> {
  const res = await fetchWithAuth(`${API}/gigs/urgent`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to create gig');
  return json.data as CreateUrgentGigResult;
}

/** GET /api/gigs/urgent/:id — returns { status, urgent_status?, selected_provider_id?, project_id? } */
export async function getUrgentGig(gigId: string): Promise<UrgentGig & { status?: string }> {
  const res = await fetchWithAuth(`${API}/gigs/urgent/${gigId}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Gig not found');
  const d = json.data as Record<string, unknown>;
  return {
    ...d,
    urgent_status: (d.urgent_status ?? d.status ?? 'searching') as UrgentGig['urgent_status'],
  } as UrgentGig & { status?: string };
}

export async function getGigResponses(gigId: string): Promise<GigResponse[]> {
  const res = await fetchWithAuth(`${API}/gigs/urgent/${gigId}/responses`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data as GigResponse[];
}

export async function respondToGig(
  gigId: string,
  action: 'accept' | 'decline',
  message?: string
): Promise<void> {
  const res = await fetchWithAuth(`${API}/gigs/${gigId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action, message: message || undefined }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}

export async function selectProvider(
  gigId: string,
  responseId: string
): Promise<{ project_id: string }> {
  const res = await fetchWithAuth(`${API}/gigs/${gigId}/select`, {
    method: 'POST',
    body: JSON.stringify({ response_id: responseId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data?.project_id) throw new Error(json.error || 'Failed to select');
  return { project_id: json.data.project_id };
}

export async function completeGig(
  gigId: string
): Promise<{ released_amount: number; currency: string }> {
  const res = await fetchWithAuth(`${API}/gigs/${gigId}/complete`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) throw new Error(json.error || 'Failed to complete');
  return json.data as { released_amount: number; currency: string };
}

export interface MyUrgentGigItem {
  id: string;
  title: string;
  skill_required: string;
  date_needed: string;
  payment_amount: number;
  payment_currency: string;
  urgent_status: string;
  expires_at: string;
  response_count: number;
  accepted_count: number;
  project_id: string | null;
  selected_provider_name: string | null;
}

export async function getMyUrgentGigs(): Promise<MyUrgentGigItem[]> {
  const res = await fetchWithAuth(`${API}/gigs/urgent/mine`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data as MyUrgentGigItem[];
}
