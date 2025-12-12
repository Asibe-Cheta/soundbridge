import { createBrowserClient } from './supabase';
import type { CustomBranding, BrandingUpdateRequest, BrandingValidationResult, BrandingValidationError } from './types/branding';

export class BrandingService {
  private supabase = createBrowserClient();

  /**
   * Get user's custom branding settings
   */
  async getUserBranding(userId: string): Promise<CustomBranding | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_branding', { user_uuid: userId });

      if (error) {
        console.error('Error fetching user branding:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as CustomBranding;
    } catch (error) {
      console.error('Error in getUserBranding:', error);
      return null;
    }
  }

  /**
   * Update user's branding settings
   */
  async updateUserBranding(userId: string, branding: BrandingUpdateRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the branding data
      const validation = this.validateBranding(branding);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      const { data, error } = await this.supabase
        .rpc('update_user_branding', {
          user_uuid: userId,
          custom_logo_url_param: branding.custom_logo_url,
          custom_logo_width_param: branding.custom_logo_width,
          custom_logo_height_param: branding.custom_logo_height,
          custom_logo_position_param: branding.custom_logo_position,
          primary_color_param: branding.primary_color,
          secondary_color_param: branding.secondary_color,
          accent_color_param: branding.accent_color,
          background_gradient_param: branding.background_gradient,
          layout_style_param: branding.layout_style,
          show_powered_by_param: branding.show_powered_by,
          watermark_enabled_param: branding.watermark_enabled,
          watermark_opacity_param: branding.watermark_opacity,
          watermark_position_param: branding.watermark_position
        });

      if (error) {
        console.error('Error updating user branding:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateUserBranding:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Upload custom logo
   */
  async uploadCustomLogo(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Please upload an image file'
        };
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return {
          success: false,
          error: 'File size must be less than 5MB'
        };
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `custom-logos/${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await this.supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading logo:', error);
        return {
          success: false,
          error: 'Failed to upload logo'
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (error) {
      console.error('Error in uploadCustomLogo:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Validate branding settings
   */
  private validateBranding(branding: BrandingUpdateRequest): BrandingValidationResult {
    const errors: BrandingValidationError[] = [];

    // Validate colors (hex format)
    if (branding.primary_color && !this.isValidHexColor(branding.primary_color)) {
      errors.push({
        field: 'primary_color',
        message: 'Primary color must be a valid hex color (e.g., #FF0000)'
      });
    }

    if (branding.secondary_color && !this.isValidHexColor(branding.secondary_color)) {
      errors.push({
        field: 'secondary_color',
        message: 'Secondary color must be a valid hex color (e.g., #FF0000)'
      });
    }

    if (branding.accent_color && !this.isValidHexColor(branding.accent_color)) {
      errors.push({
        field: 'accent_color',
        message: 'Accent color must be a valid hex color (e.g., #FF0000)'
      });
    }

    // Validate opacity
    if (branding.watermark_opacity !== undefined) {
      if (branding.watermark_opacity < 0 || branding.watermark_opacity > 1) {
        errors.push({
          field: 'watermark_opacity',
          message: 'Watermark opacity must be between 0.0 and 1.0'
        });
      }
    }

    // Validate logo dimensions
    if (branding.custom_logo_width !== undefined) {
      if (branding.custom_logo_width < 50 || branding.custom_logo_width > 500) {
        errors.push({
          field: 'custom_logo_width',
          message: 'Logo width must be between 50 and 500 pixels'
        });
      }
    }

    if (branding.custom_logo_height !== undefined) {
      if (branding.custom_logo_height < 20 || branding.custom_logo_height > 200) {
        errors.push({
          field: 'custom_logo_height',
          message: 'Logo height must be between 20 and 200 pixels'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Get user's subscription tier for branding restrictions
   */
  async getUserTier(userId: string): Promise<'free' | 'premium' | 'unlimited'> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error getting user tier:', error);
        return 'free';
      }

      // Map tier to correct values
      const tier = data.subscription_tier || 'free';
      return tier as 'free' | 'premium' | 'unlimited';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }
}

export const brandingService = new BrandingService();
