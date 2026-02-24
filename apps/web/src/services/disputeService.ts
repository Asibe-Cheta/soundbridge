/**
 * Dispute API service — raise, get, respond
 * See w.md §3.4 and MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md
 */

import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import type { Dispute } from '@/src/lib/types/dispute.types';

const API = '/api';

export async function raiseDispute(
  projectId: string,
  reason: string,
  description: string,
  evidenceUrls?: string[]
): Promise<{ dispute_id: string }> {
  const res = await fetchWithAuth(`${API}/disputes`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      reason,
      description,
      evidence_urls: evidenceUrls ?? undefined,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data?.dispute_id) {
    throw new Error(json.error || 'Failed to raise dispute');
  }
  return { dispute_id: json.data.dispute_id };
}

export async function getDispute(disputeId: string): Promise<Dispute> {
  const res = await fetchWithAuth(`${API}/disputes/${disputeId}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Dispute not found');
  }
  return json.data as Dispute;
}

export async function respondToDispute(
  disputeId: string,
  response: string,
  counterEvidenceUrls?: string[]
): Promise<void> {
  const res = await fetchWithAuth(`${API}/disputes/${disputeId}/respond`, {
    method: 'POST',
    body: JSON.stringify({
      response,
      counter_evidence_urls: counterEvidenceUrls ?? undefined,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}
