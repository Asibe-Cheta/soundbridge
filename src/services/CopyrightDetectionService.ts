import { supabase } from '../lib/supabase';

interface UploadCheck {
  allowed: boolean;
  risk: 'low' | 'medium' | 'high';
  reason?: string;
  requiresReview: boolean;
}

class CopyrightDetectionService {
  // List of major artists (update regularly)
  private readonly majorArtists = [
    'beyonce', 'drake', 'taylor swift', 'ed sheeran', 'ariana grande',
    'davido', 'wizkid', 'burna boy', 'tiwa savage', 'asake', 'rema',
    'adele', 'justin bieber', 'billie eilish', 'the weeknd',
    'bad bunny', 'dua lipa', 'harry styles', 'lizzo', 'kendrick lamar',
  ];

  private readonly majorLabels = [
    'universal', 'sony', 'warner', 'emi', 'columbia',
    'atlantic', 'def jam', 'interscope', 'rca', 'capitol',
  ];

  private readonly suspiciousKeywords = [
    'official audio', 'official video', 'official music video',
    'vevo', 'lyric video', 'audio official', 'remix official',
    'album version', 'deluxe edition',
  ];

  /**
   * Check if upload is suspicious
   */
  async checkUpload(metadata: {
    title: string;
    artist: string;
    album?: string;
    recordLabel?: string;
    userId: string;
  }): Promise<UploadCheck> {
    const titleLower = metadata.title.toLowerCase();
    const artistLower = metadata.artist.toLowerCase();
    const albumLower = metadata.album?.toLowerCase() || '';
    const labelLower = metadata.recordLabel?.toLowerCase() || '';

    // Check 1: Major artist name
    const hasMajorArtist = this.majorArtists.some(artist => 
      artistLower.includes(artist) || titleLower.includes(artist)
    );

    if (hasMajorArtist) {
      return {
        allowed: false,
        risk: 'high',
        reason: 'Major artist name detected. If this is your work, please verify your identity.',
        requiresReview: true,
      };
    }

    // Check 2: Major label
    const hasMajorLabel = this.majorLabels.some(label =>
      labelLower.includes(label)
    );

    if (hasMajorLabel) {
      return {
        allowed: false,
        risk: 'high',
        reason: 'Major record label detected. Please provide proof of rights.',
        requiresReview: true,
      };
    }

    // Check 3: Suspicious keywords (medium risk - allow but flag)
    const hasSuspiciousKeywords = this.suspiciousKeywords.some(keyword =>
      titleLower.includes(keyword)
    );

    if (hasSuspiciousKeywords) {
      return {
        allowed: true,
        risk: 'medium',
        reason: 'Contains suspicious keywords. Will be reviewed.',
        requiresReview: true,
      };
    }

    // Check 4: User history
    const userHistory = await this.getUserCopyrightHistory(metadata.userId);
    
    if (userHistory.strikeCount >= 2) {
      return {
        allowed: false,
        risk: 'high',
        reason: 'User has previous copyright strikes. Manual review required.',
        requiresReview: true,
      };
    }

    // Check 5: New user (upload count < 3)
    if (userHistory.uploadCount < 3) {
      return {
        allowed: true,
        risk: 'medium',
        reason: 'New user - flagged for spot check',
        requiresReview: true,
      };
    }

    // Passed all checks
    return {
      allowed: true,
      risk: 'low',
      requiresReview: false,
    };
  }

  /**
   * Get user's copyright history
   */
  private async getUserCopyrightHistory(userId: string) {
    const { data: user } = await supabase
      .from('profiles')
      .select('copyright_strikes, total_uploads')
      .eq('id', userId)
      .single();

    return {
      strikeCount: user?.copyright_strikes || 0,
      uploadCount: user?.total_uploads || 0,
    };
  }

  /**
   * Flag content for manual review
   */
  async flagForReview(trackId: string, reason: string, risk: 'low' | 'medium' | 'high') {
    await supabase
      .from('flagged_content')
      .insert({
        content_id: trackId,
        content_type: 'audio_track',
        flag_reason: reason,
        risk_level: risk,
        flagged_at: new Date().toISOString(),
        status: 'pending',
      });

    console.log(`­ƒÜ® Flagged track ${trackId} for review: ${reason}`);
  }

  /**
   * Record copyright strike
   */
  async recordStrike(userId: string, trackId: string, reason: string) {
    // Increment user's strike count
    const { data: currentUser } = await supabase
      .from('users')
      .select('copyright_strikes')
      .eq('id', userId)
      .single();

    const newStrikeCount = (currentUser?.copyright_strikes || 0) + 1;

    await supabase
      .from('users')
      .update({ copyright_strikes: newStrikeCount })
      .eq('id', userId);

    // Log the strike
    await supabase
      .from('copyright_strikes')
      .insert({
        user_id: userId,
        track_id: trackId,
        strike_reason: reason,
        strike_date: new Date().toISOString(),
      });

    // Check if user should be banned (3 strikes)
    if (newStrikeCount >= 3) {
      await this.banUser(userId);
    }
  }

  /**
   * Ban user for repeat infringement
   */
  private async banUser(userId: string) {
    await supabase
      .from('profiles')
      .update({
        banned: true,
        ban_reason: 'Repeat copyright infringement (3 strikes)',
        banned_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', userId);

    console.log(`­ƒÜ½ User ${userId} banned for repeat copyright infringement`);
  }

  /**
   * Process DMCA takedown
   */
  async processTakedown(trackId: string, dmcaDetails: {
    complainant: string;
    complainantEmail: string;
    copyrightWork: string;
    infringementEvidence: string;
  }) {
    // Get track and user info
    const { data: track } = await supabase
      .from('audio_tracks')
      .select('creator_id')
      .eq('id', trackId)
      .single();

    if (!track) return;

    // Remove track immediately
    await supabase
      .from('audio_tracks')
      .update({
        status: 'removed',
        removed_reason: 'DMCA takedown',
        removed_at: new Date().toISOString(),
      })
      .eq('id', trackId);

    // Record strike
    await this.recordStrike(track.creator_id, trackId, 'DMCA takedown');

    // Log takedown
    await supabase
      .from('dmca_takedowns')
      .insert({
        track_id: trackId,
        user_id: track.creator_id,
        complainant: dmcaDetails.complainant,
        complainant_email: dmcaDetails.complainantEmail,
        copyright_work: dmcaDetails.copyrightWork,
        evidence: dmcaDetails.infringementEvidence,
        processed_at: new Date().toISOString(),
      });

    console.log(`Ô£à DMCA takedown processed for track ${trackId}`);
  }

  /**
   * Report content
   * Uses both content_reports (our table) and admin_review_queue (web app team's table)
   */
  async reportContent(
    contentId: string,
    contentType: 'audio_track' | 'event' | 'user',
    reportReason: string,
    reportDetails: string,
    reportedBy: string
  ) {
    // Insert into content_reports table (our copyright system)
    await supabase
      .from('content_reports')
      .insert({
        content_id: contentId,
        content_type: contentType,
        report_reason: reportReason,
        report_details: reportDetails,
        reported_by: reportedBy,
        reported_at: new Date().toISOString(),
        status: 'pending',
      });

    // Also insert into admin_review_queue (web app team's system)
    const reportData = {
      reported_item_type: contentType,
      reported_item_id: contentId,
      reporter_id: reportedBy,
      reason: reportReason,
      description: reportDetails,
      reported_at: new Date().toISOString()
    };

    await supabase.from('admin_review_queue').insert({
      queue_type: 'content_report',
      priority: reportReason === 'copyright' ? 'high' : 'normal',
      status: 'pending',
      reference_data: reportData
    });

    console.log(`­ƒôØ Content reported: ${contentId} by ${reportedBy}`);
  }
}

export default new CopyrightDetectionService();

