import { createBrowserClient } from './supabase';
import type {
  CopyrightCheckResult,
  CopyrightViolationReport,
  DMCARequest,
  CopyrightSettings,
  AudioFingerprint
} from './types/upload';

export class CopyrightProtectionService {
  private supabase = createBrowserClient();

  // Default copyright settings
  private defaultSettings: CopyrightSettings = {
    enableAutomatedChecking: true,
    confidenceThreshold: 0.7,
    enableCommunityReporting: true,
    enableDMCARequests: true,
    autoFlagThreshold: 0.8,
    autoBlockThreshold: 0.95,
    requireManualReview: false,
    whitelistEnabled: true,
    blacklistEnabled: true
  };

  /**
   * Generate audio fingerprint for copyright checking
   */
  async generateAudioFingerprint(audioFile: File): Promise<AudioFingerprint> {
    try {
      // Create audio context for fingerprinting
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Extract audio data
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      
      // Generate fingerprint using a simple hash algorithm
      // In production, use a more sophisticated fingerprinting library
      const fingerprint = this.generateSimpleFingerprint(channelData, sampleRate);
      
      return {
        hash: fingerprint,
        algorithm: 'simple_hash_v1',
        confidence: 0.8,
        metadata: {
          duration,
          sampleRate,
          channels: audioBuffer.numberOfChannels,
          format: audioFile.type
        }
      };
    } catch (error) {
      console.error('Error generating audio fingerprint:', error);
      throw new Error('Failed to generate audio fingerprint');
    }
  }

  /**
   * Simple fingerprint generation (placeholder for production implementation)
   */
  private generateSimpleFingerprint(channelData: Float32Array, sampleRate: number): string {
    // This is a simplified fingerprint - in production, use libraries like:
    // - chromaprint (AcoustID)
    // - audio-fingerprint
    // - or integrate with services like Audible Magic, Pex, etc.
    
    const samples = Math.min(channelData.length, sampleRate * 30); // Use first 30 seconds
    const step = Math.floor(samples / 1000); // Take 1000 samples
    let hash = 0;
    
    for (let i = 0; i < samples; i += step) {
      const sample = Math.abs(channelData[i]);
      hash = ((hash << 5) - hash + sample) & 0xFFFFFFFF;
    }
    
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Check if uploaded content violates copyright
   */
  async checkCopyrightViolation(
    trackId: string,
    creatorId: string,
    audioFile: File
  ): Promise<CopyrightCheckResult> {
    try {
      // Generate fingerprint
      const fingerprint = await this.generateAudioFingerprint(audioFile);
      
      // Get copyright settings
      const settings = await this.getCopyrightSettings();
      
      // Check whitelist first
      if (settings.whitelistEnabled) {
        const whitelistMatch = await this.checkWhitelist(fingerprint.hash);
        if (whitelistMatch) {
          return {
            isViolation: false,
            confidence: 1.0,
            recommendation: 'approve'
          };
        }
      }
      
      // Check blacklist
      if (settings.blacklistEnabled) {
        const blacklistMatch = await this.checkBlacklist(fingerprint.hash);
        if (blacklistMatch) {
          return {
            isViolation: true,
            confidence: 0.95,
            matchedTrack: {
              title: blacklistMatch.track_title,
              artist: blacklistMatch.artist_name,
              rightsHolder: blacklistMatch.rights_holder,
              releaseDate: blacklistMatch.release_date
            },
            violationType: 'copyright_infringement',
            recommendation: 'block'
          };
        }
      }
      
      // Check existing copyright protection records
      const existingCheck = await this.checkExistingProtection(trackId);
      if (existingCheck) {
        return {
          isViolation: existingCheck.status === 'blocked',
          confidence: existingCheck.confidence_score || 0.5,
          recommendation: this.getRecommendationFromStatus(existingCheck.status, existingCheck.confidence_score || 0.5, settings)
        };
      }
      
      // Create copyright protection record
      await this.createCopyrightProtectionRecord(trackId, creatorId, fingerprint);
      
      // For now, return approve (in production, integrate with ACR services)
      return {
        isViolation: false,
        confidence: 0.5,
        recommendation: 'approve'
      };
      
    } catch (error) {
      console.error('Error checking copyright violation:', error);
      return {
        isViolation: false,
        confidence: 0.0,
        recommendation: 'manual_review'
      };
    }
  }

  /**
   * Check whitelist for known safe content
   */
  private async checkWhitelist(fingerprintHash: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('copyright_whitelist')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .single();
    
    if (error) {
      console.error('Error checking whitelist:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Check blacklist for known copyrighted content
   */
  private async checkBlacklist(fingerprintHash: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('copyright_blacklist')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .single();
    
    if (error) {
      console.error('Error checking blacklist:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Check existing copyright protection record
   */
  private async checkExistingProtection(trackId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('copyright_protection')
      .select('*')
      .eq('track_id', trackId)
      .single();
    
    if (error) {
      console.error('Error checking existing protection:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Create copyright protection record
   */
  private async createCopyrightProtectionRecord(
    trackId: string,
    creatorId: string,
    fingerprint: AudioFingerprint
  ): Promise<void> {
    const { error } = await this.supabase
      .from('copyright_protection')
      .insert({
        track_id: trackId,
        creator_id: creatorId,
        status: 'pending',
        check_type: 'automated',
        fingerprint_hash: fingerprint.hash,
        confidence_score: fingerprint.confidence,
        matched_track_info: null
      });
    
    if (error) {
      console.error('Error creating copyright protection record:', error);
      throw error;
    }
  }

  /**
   * Get recommendation based on status and confidence
   */
  private getRecommendationFromStatus(
    status: string,
    confidence: number,
    settings: CopyrightSettings
  ): 'approve' | 'flag' | 'block' | 'manual_review' {
    switch (status) {
      case 'approved':
        return 'approve';
      case 'blocked':
        return 'block';
      case 'flagged':
        return confidence >= settings.autoBlockThreshold ? 'block' : 'flag';
      default:
        return confidence >= settings.autoFlagThreshold ? 'flag' : 'manual_review';
    }
  }

  /**
   * Get copyright settings
   */
  async getCopyrightSettings(): Promise<CopyrightSettings> {
    try {
      const { data, error } = await this.supabase
        .from('copyright_settings')
        .select('setting_value')
        .eq('setting_key', 'default_settings')
        .single();
      
      if (error || !data) {
        return this.defaultSettings;
      }
      
      return { ...this.defaultSettings, ...data.setting_value };
    } catch (error) {
      console.error('Error getting copyright settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Report copyright violation
   */
  async reportViolation(report: CopyrightViolationReport): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('copyright_violations')
        .insert({
          track_id: report.trackId,
          reporter_id: report.reporterId,
          violation_type: report.violationType,
          description: report.description,
          evidence_urls: report.evidenceUrls || [],
          status: 'pending'
        });
      
      if (error) {
        console.error('Error reporting violation:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error reporting violation:', error);
      return { success: false, error: 'Failed to report violation' };
    }
  }

  /**
   * Submit DMCA request
   */
  async submitDMCARequest(request: DMCARequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('dmca_requests')
        .insert({
          track_id: request.trackId,
          requester_name: request.requesterName,
          requester_email: request.requesterEmail,
          requester_phone: request.requesterPhone,
          rights_holder: request.rightsHolder,
          infringement_description: request.infringementDescription,
          original_work_description: request.originalWorkDescription,
          good_faith_statement: request.goodFaithStatement,
          accuracy_statement: request.accuracyStatement,
          authority_statement: request.authorityStatement,
          contact_address: request.contactAddress,
          status: 'pending'
        });
      
      if (error) {
        console.error('Error submitting DMCA request:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting DMCA request:', error);
      return { success: false, error: 'Failed to submit DMCA request' };
    }
  }

  /**
   * Update copyright protection status
   */
  async updateCopyrightStatus(
    trackId: string,
    status: 'pending' | 'approved' | 'flagged' | 'blocked',
    reviewerId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (reviewerId) {
        updateData.reviewer_id = reviewerId;
      }
      
      if (notes) {
        updateData.review_notes = notes;
      }
      
      const { error } = await this.supabase
        .from('copyright_protection')
        .update(updateData)
        .eq('track_id', trackId);
      
      if (error) {
        console.error('Error updating copyright status:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating copyright status:', error);
      return { success: false, error: 'Failed to update copyright status' };
    }
  }

  /**
   * Get copyright protection statistics
   */
  async getCopyrightStats(): Promise<{
    totalTracks: number;
    pendingReviews: number;
    flaggedTracks: number;
    blockedTracks: number;
    violationsReported: number;
  }> {
    try {
      const [
        { count: totalTracks },
        { count: pendingReviews },
        { count: flaggedTracks },
        { count: blockedTracks },
        { count: violationsReported }
      ] = await Promise.all([
        this.supabase.from('copyright_protection').select('*', { count: 'exact', head: true }),
        this.supabase.from('copyright_protection').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        this.supabase.from('copyright_protection').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        this.supabase.from('copyright_protection').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
        this.supabase.from('copyright_violations').select('*', { count: 'exact', head: true })
      ]);
      
      return {
        totalTracks: totalTracks || 0,
        pendingReviews: pendingReviews || 0,
        flaggedTracks: flaggedTracks || 0,
        blockedTracks: blockedTracks || 0,
        violationsReported: violationsReported || 0
      };
    } catch (error) {
      console.error('Error getting copyright stats:', error);
      return {
        totalTracks: 0,
        pendingReviews: 0,
        flaggedTracks: 0,
        blockedTracks: 0,
        violationsReported: 0
      };
    }
  }
}

// Export singleton instance
export const copyrightService = new CopyrightProtectionService();
