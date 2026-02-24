/**
 * Gig ratings (post-project, mutual, blind until both submitted)
 * See w.md §2.3
 */

export interface GigRating {
  id: string;
  project_id: string;
  rater_id: string;
  ratee_id: string;
  overall_rating: number;
  professionalism_rating: number;
  punctuality_rating: number;
  quality_rating?: number;
  payment_promptness_rating?: number;
  review_text?: string;
  created_at: string;
}

export interface GigRatingProjectResult {
  both_submitted: boolean;
  has_rated: boolean;
  my_rating: GigRating | null;
  their_rating: GigRating | null;
}

export interface GigRatingUserResult {
  average_rating: number | null;
  total_reviews: number;
  ratings: Array<
    GigRating & { rater_profile?: { display_name: string; avatar_url?: string } }
  >;
}
