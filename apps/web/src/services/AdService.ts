'use client';

import { v4 as uuidv4 } from 'uuid';

export interface AdConfig {
  show_banners: boolean;
  show_interstitials: boolean;
  interstitial_frequency: number;
  banner_positions: string[];
  user_tier: 'free' | 'pro' | 'enterprise';
}

export class AdService {
  private static instance: AdService;
  private sessionId: string;
  private trackPlaysCount: number = 0;
  private adConfig: AdConfig | null = null;

  private constructor() {
    // Generate unique session ID
    this.sessionId = uuidv4();
  }

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Get session ID for tracking
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Fetch ad configuration from API
   */
  async fetchAdConfig(): Promise<AdConfig> {
    try {
      const response = await fetch('/api/ads/config');
      const data = await response.json();
      
      if (data.success && data.config) {
        this.adConfig = data.config;
        return data.config;
      }
      
      // Default config for free tier
      return {
        show_banners: true,
        show_interstitials: true,
        interstitial_frequency: 3,
        banner_positions: ['feed', 'sidebar', 'footer'],
        user_tier: 'free'
      };
    } catch (error) {
      console.error('Failed to fetch ad config:', error);
      // Return default config on error
      return {
        show_banners: true,
        show_interstitials: true,
        interstitial_frequency: 3,
        banner_positions: ['feed', 'sidebar', 'footer'],
        user_tier: 'free'
      };
    }
  }

  /**
   * Check if user should see ads based on subscription tier
   */
  shouldShowAds(userTier?: 'free' | 'pro' | 'enterprise'): boolean {
    const tier = userTier || this.adConfig?.user_tier || 'free';
    return tier === 'free';
  }

  /**
   * Check if user should see banner ads
   */
  shouldShowBanners(userTier?: 'free' | 'pro' | 'enterprise'): boolean {
    if (!this.shouldShowAds(userTier)) {
      return false;
    }
    return this.adConfig?.show_banners ?? true;
  }

  /**
   * Check if user should see interstitial ads
   */
  shouldShowInterstitials(userTier?: 'free' | 'pro' | 'enterprise'): boolean {
    if (!this.shouldShowAds(userTier)) {
      return false;
    }
    return this.adConfig?.show_interstitials ?? true;
  }

  /**
   * Get ad frequency (how often to show interstitial ads)
   */
  getAdFrequency(): number {
    return this.adConfig?.interstitial_frequency ?? 3;
  }

  /**
   * Get allowed banner positions
   */
  getBannerPositions(): string[] {
    return this.adConfig?.banner_positions ?? ['feed', 'sidebar', 'footer'];
  }

  /**
   * Track when a song/track is played
   * Returns true if an interstitial ad should be shown
   */
  trackPlay(): boolean {
    this.trackPlaysCount++;
    const frequency = this.getAdFrequency();
    
    // Show interstitial ad every N tracks
    if (this.trackPlaysCount >= frequency) {
      this.trackPlaysCount = 0; // Reset counter
      return true;
    }
    
    return false;
  }

  /**
   * Reset play counter (e.g., when user upgrades)
   */
  resetPlayCounter(): void {
    this.trackPlaysCount = 0;
  }

  /**
   * Track ad impression
   */
  async trackImpression(
    adId: string,
    adType: 'banner' | 'interstitial',
    placement?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/ads/impression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          ad_type: adType,
          placement: placement,
          page_url: window.location.href,
          session_id: this.sessionId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Ad impression tracked: ${adId}`);
        return true;
      } else {
        console.error('Failed to track ad impression:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error tracking ad impression:', error);
      return false;
    }
  }

  /**
   * Track ad click
   */
  async trackClick(adId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/ads/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          session_id: this.sessionId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Ad click tracked: ${adId}`);
        return true;
      } else {
        console.error('Failed to track ad click:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
      return false;
    }
  }

  /**
   * Generate unique ad ID
   */
  generateAdId(prefix: string = 'ad'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const adService = AdService.getInstance();

