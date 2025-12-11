import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job for AI-powered collaboration matching (Premium/Unlimited feature)
 * Should be called weekly (e.g., every Monday at 9:00 AM UTC)
 *
 * Algorithm (from specification):
 * - Genre overlap (50% weight)
 * - Location proximity (25% weight)
 * - Role compatibility (15% weight)
 * - Activity level (10% weight)
 * - Bonuses: Mutual connections (+10%), Similar career stage (+5%)
 * - Minimum score: 60/100 to suggest
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🤝 CRON: Starting collaboration matching...');

    // Get all Premium/Unlimited users who are active
    const { data: eligibleUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, location, genres, role, activity_level, follower_count')
      .in('subscription_tier', ['premium', 'unlimited'])
      .eq('subscription_status', 'active');

    if (fetchError) {
      console.error('❌ Error fetching eligible users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('ℹ️ No eligible users for collaboration matching');
      return NextResponse.json({
        success: true,
        message: 'No eligible users',
        matchesCreated: 0,
      });
    }

    let totalMatchesCreated = 0;

    // For each user, find 3-5 matches
    for (const user of eligibleUsers) {
      const matches = await findMatches(supabase, user, eligibleUsers);

      if (matches.length > 0) {
        // Store matches (create notification)
        await createMatchNotifications(supabase, user.id, matches);
        totalMatchesCreated += matches.length;

        console.log(`✅ Found ${matches.length} matches for user ${user.id}`);
      }
    }

    console.log(`✅ CRON: Collaboration matching completed. Created ${totalMatchesCreated} matches`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed: eligibleUsers.length,
      matchesCreated: totalMatchesCreated,
    });

  } catch (error: any) {
    console.error('❌ CRON: Error in collaboration matching:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Find matches for a user using weighted algorithm
 */
async function findMatches(supabase: any, user: any, allUsers: any[]): Promise<any[]> {
  const candidates = allUsers.filter(candidate => candidate.id !== user.id);
  const scoredCandidates: Array<{ candidate: any; score: number; reasons: string[] }> = [];

  for (const candidate of candidates) {
    const { score, reasons } = calculateMatchScore(user, candidate);

    if (score >= 60) { // Minimum threshold
      scoredCandidates.push({ candidate, score, reasons });
    }
  }

  // Sort by score (highest first) and return top 5
  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({
      ...item.candidate,
      match_score: item.score,
      match_reasons: item.reasons,
    }));
}

/**
 * Calculate match score based on weighted algorithm
 */
function calculateMatchScore(user: any, candidate: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Genre overlap (50% weight = 50 points max)
  const userGenres = parseGenres(user.genres);
  const candidateGenres = parseGenres(candidate.genres);
  const genreOverlap = userGenres.filter(g => candidateGenres.includes(g)).length;
  const genreScore = Math.min((genreOverlap / Math.max(userGenres.length, 1)) * 50, 50);
  score += genreScore;

  if (genreOverlap > 0) {
    reasons.push(`Both create ${userGenres.find(g => candidateGenres.includes(g))} music`);
  }

  // 2. Location proximity (25% weight = 25 points max)
  const locationScore = calculateLocationScore(user.location, candidate.location);
  score += locationScore;

  if (locationScore > 15) {
    reasons.push(`Both based in ${user.location || 'same area'}`);
  }

  // 3. Role compatibility (15% weight = 15 points max)
  const roleScore = calculateRoleCompatibility(user.role, candidate.role);
  score += roleScore;

  if (roleScore > 10) {
    reasons.push(`${user.role} and ${candidate.role} often collaborate`);
  }

  // 4. Activity level (10% weight = 10 points max)
  const activityScore = calculateActivityScore(user.activity_level, candidate.activity_level);
  score += activityScore;

  // Bonuses
  // 5. Mutual connections (+10% = 10 points)
  // TODO: Implement mutual connections check
  const mutualConnectionsBonus = 0;
  score += mutualConnectionsBonus;

  // 6. Similar career stage (+5% = 5 points)
  const careerStageBonus = calculateCareerStageBonus(user.follower_count, candidate.follower_count);
  score += careerStageBonus;

  if (careerStageBonus > 3) {
    reasons.push('Similar follower count');
  }

  return { score: Math.min(Math.round(score), 100), reasons };
}

/**
 * Parse genres (assume comma-separated or array)
 */
function parseGenres(genres: any): string[] {
  if (!genres) return [];
  if (Array.isArray(genres)) return genres;
  if (typeof genres === 'string') return genres.split(',').map(g => g.trim().toLowerCase());
  return [];
}

/**
 * Calculate location score (25 points max)
 */
function calculateLocationScore(userLocation: string, candidateLocation: string): number {
  if (!userLocation || !candidateLocation) return 0;

  const userLoc = userLocation.toLowerCase();
  const candidateLoc = candidateLocation.toLowerCase();

  // Exact match
  if (userLoc === candidateLoc) return 25;

  // Same city (rough check)
  const userParts = userLoc.split(',').map(p => p.trim());
  const candidateParts = candidateLoc.split(',').map(p => p.trim());

  if (userParts.some(p => candidateParts.includes(p))) {
    return 20; // Partial match (same city or country)
  }

  return 0;
}

/**
 * Calculate role compatibility (15 points max)
 * Artists + Producers = high compatibility
 * Artists + Venues = high compatibility
 * Artists + Artists = medium compatibility
 */
function calculateRoleCompatibility(userRole: string, candidateRole: string): number {
  if (!userRole || !candidateRole) return 5;

  const role1 = userRole.toLowerCase();
  const role2 = candidateRole.toLowerCase();

  const highCompatibility = [
    ['artist', 'producer'],
    ['artist', 'venue'],
    ['producer', 'artist'],
    ['venue', 'artist'],
  ];

  const mediumCompatibility = [
    ['artist', 'artist'],
    ['producer', 'producer'],
  ];

  if (highCompatibility.some(([r1, r2]) => (role1 === r1 && role2 === r2))) {
    return 15;
  }

  if (mediumCompatibility.some(([r1, r2]) => (role1 === r1 && role2 === r2))) {
    return 10;
  }

  return 5;
}

/**
 * Calculate activity score (10 points max)
 * Users with similar activity levels match better
 */
function calculateActivityScore(userActivity: number, candidateActivity: number): number {
  if (!userActivity || !candidateActivity) return 5;

  const diff = Math.abs(userActivity - candidateActivity);
  const score = Math.max(10 - diff, 0);
  return score;
}

/**
 * Calculate career stage bonus (5 points max)
 * Users with similar follower counts match better
 */
function calculateCareerStageBonus(userFollowers: number, candidateFollowers: number): number {
  if (!userFollowers || !candidateFollowers) return 0;

  const ratio = Math.min(userFollowers, candidateFollowers) / Math.max(userFollowers, candidateFollowers);

  if (ratio > 0.7) return 5; // Very similar
  if (ratio > 0.5) return 3; // Somewhat similar
  return 0;
}

/**
 * Create match notifications for user
 */
async function createMatchNotifications(supabase: any, userId: string, matches: any[]) {
  // Store matches in a notifications table or send email
  // For now, just log
  console.log(`📧 TODO: Send collaboration matches to user ${userId}:`, matches.length);

  // TODO: Create in-app notifications
  // TODO: Send email with match details
}
