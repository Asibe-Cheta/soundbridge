export interface CustomBranding {
  id?: string;
  user_id: string;
  
  // Custom Logo Settings
  custom_logo_url?: string;
  custom_logo_width: number;
  custom_logo_height: number;
  custom_logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  
  // Theme Customization
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_gradient: string;
  
  // Layout Options
  layout_style: 'default' | 'minimal' | 'creative' | 'professional';
  show_powered_by: boolean;
  
  // Watermark Settings
  watermark_enabled: boolean;
  watermark_opacity: number; // 0.0 to 1.0
  watermark_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  user_tier?: 'free' | 'pro' | 'enterprise';
}

export interface BrandingUpdateRequest {
  custom_logo_url?: string;
  custom_logo_width?: number;
  custom_logo_height?: number;
  custom_logo_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_gradient?: string;
  layout_style?: 'default' | 'minimal' | 'creative' | 'professional';
  show_powered_by?: boolean;
  watermark_enabled?: boolean;
  watermark_opacity?: number;
  watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface BrandingValidationError {
  field: string;
  message: string;
}

export interface BrandingValidationResult {
  isValid: boolean;
  errors: BrandingValidationError[];
}

// Default branding configurations
export const DEFAULT_BRANDING: CustomBranding = {
  user_id: '',
  custom_logo_width: 120,
  custom_logo_height: 40,
  custom_logo_position: 'top-left',
  primary_color: '#DC2626',
  secondary_color: '#EC4899',
  accent_color: '#F97316',
  background_gradient: 'from-gray-900 via-gray-800 to-gray-900',
  layout_style: 'default',
  show_powered_by: true,
  watermark_enabled: true,
  watermark_opacity: 0.1,
  watermark_position: 'bottom-right',
  user_tier: 'free'
};

// Tier-based restrictions
export const BRANDING_RESTRICTIONS = {
  free: {
    canHidePoweredBy: false,
    canHideWatermark: false,
    canCustomizeLogo: false,
    canCustomizeColors: false,
    canCustomizeLayout: false,
    maxLogoSize: 0, // No custom logo allowed
  },
  pro: {
    canHidePoweredBy: true,
    canHideWatermark: true,
    canCustomizeLogo: true,
    canCustomizeColors: true,
    canCustomizeLayout: true,
    maxLogoSize: 2 * 1024 * 1024, // 2MB
  },
  enterprise: {
    canHidePoweredBy: true,
    canHideWatermark: true,
    canCustomizeLogo: true,
    canCustomizeColors: true,
    canCustomizeLayout: true,
    maxLogoSize: 5 * 1024 * 1024, // 5MB
  }
};

// Layout style configurations
export const LAYOUT_STYLES = {
  default: {
    name: 'Default',
    description: 'Standard SoundBridge layout with full features',
    preview: '/images/layout-previews/default.png'
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean, minimal design with essential elements only',
    preview: '/images/layout-previews/minimal.png'
  },
  creative: {
    name: 'Creative',
    description: 'Bold, artistic layout perfect for musicians and artists',
    preview: '/images/layout-previews/creative.png'
  },
  professional: {
    name: 'Professional',
    description: 'Corporate-style layout for business professionals',
    preview: '/images/layout-previews/professional.png'
  }
};

// Predefined color schemes
export const COLOR_SCHEMES = {
  soundbridge: {
    name: 'SoundBridge',
    primary: '#DC2626',
    secondary: '#EC4899',
    accent: '#F97316',
    gradient: 'from-gray-900 via-gray-800 to-gray-900'
  },
  ocean: {
    name: 'Ocean Blue',
    primary: '#0EA5E9',
    secondary: '#06B6D4',
    accent: '#3B82F6',
    gradient: 'from-blue-900 via-blue-800 to-cyan-900'
  },
  sunset: {
    name: 'Sunset',
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#EC4899',
    gradient: 'from-orange-900 via-red-800 to-pink-900'
  },
  forest: {
    name: 'Forest',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    gradient: 'from-green-900 via-emerald-800 to-teal-900'
  },
  purple: {
    name: 'Purple Dreams',
    primary: '#8B5CF6',
    secondary: '#A855F7',
    accent: '#C084FC',
    gradient: 'from-purple-900 via-violet-800 to-fuchsia-900'
  },
  midnight: {
    name: 'Midnight',
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#8B5CF6',
    gradient: 'from-gray-900 via-indigo-900 to-purple-900'
  }
};
