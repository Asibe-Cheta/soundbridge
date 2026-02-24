/**
 * Gig ratings API service
 * See w.md §3.3 and MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md
 */

import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import type { GigRatingProjectResult, GigRatingUserResult } from '@/src/lib/types/gig-rating.types';

const API = '/api';

export interface SubmitRatingInput {
  project_id: string;
  ratee_id: string;
  overall_rating: number;
  professionalism_rating: number;
  punctuality_rating: number;
  quality_rating?: number;
  payment_promptness_rating?: number;
  review_text?: string;
}

export async function submitRating(data: SubmitRatingInput): Promise<void> {
  const res = await fetchWithAuth(`${API}/gig-ratings`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: data.project_id,
      ratee_id: data.ratee_id,
      overall_rating: data.overall_rating,
      professionalism_rating: data.professionalism_rating,
      punctuality_rating: data.punctuality_rating,
      quality_rating: data.quality_rating,
      payment_promptness_rating: data.payment_promptness_rating,
      review_text: data.review_text,
    }),
  });
  if (res.status === 409) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'You have already rated this project');
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}

export async function getProjectRatings(projectId: string): Promise<GigRatingProjectResult> {
  const res = await fetchWithAuth(`${API}/gig-ratings/project/${projectId}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to load ratings');
  }
  return json.data as GigRatingProjectResult;
}

export async function getUserRatings(userId: string): Promise<GigRatingUserResult> {
  const res = await fetch(`${API}/gig-ratings/user/${userId}`, { credentials: 'include' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to load ratings');
  }
  return json.data as GigRatingUserResult;
}
