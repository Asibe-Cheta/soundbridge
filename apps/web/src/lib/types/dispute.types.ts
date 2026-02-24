/**
 * Dispute lifecycle for opportunity projects (planned + urgent gigs)
 * See w.md §2.4
 */

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_release'
  | 'resolved_split';

export interface Dispute {
  id: string;
  project_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string;
  evidence_urls: string[] | null;
  status: DisputeStatus;
  counter_response: string | null;
  counter_evidence_urls: string[] | null;
  resolution_notes: string | null;
  split_percent: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    title?: string;
    opportunity_id?: string;
    poster_user_id?: string;
    creator_user_id?: string;
    status?: string;
  };
  raiser_profile?: { display_name: string; avatar_url?: string; username?: string };
  against_profile?: { display_name: string; avatar_url?: string; username?: string };
}
