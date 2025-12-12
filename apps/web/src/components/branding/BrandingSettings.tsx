'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { brandingService } from '../../lib/branding-service';
import { BRANDING_RESTRICTIONS, COLOR_SCHEMES, LAYOUT_STYLES } from '../../lib/types/branding';
import type { CustomBranding, BrandingUpdateRequest } from '../../lib/types/branding';
import { Upload, Palette, Layout, Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle, X, Settings } from 'lucide-react';

interface BrandingSettingsProps {
  userId: string;
  onClose: () => void;
}

export function BrandingSettings({ userId, onClose }: BrandingSettingsProps) {
  const [branding, setBranding] = useState<CustomBranding | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'unlimited'>('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'logo' | 'layout' | 'watermark'>('colors');

  useEffect(() => {
    loadBranding();
  }, [userId]);

  const loadBranding = async () => {
    try {
      const [brandingData, tier] = await Promise.all([
        brandingService.getUserBranding(userId),
        brandingService.getUserTier(userId)
      ]);
      setBranding(brandingData);
      setUserTier(tier);
    } catch (error) {
      console.error('Error loading branding:', error);
      setError('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<BrandingUpdateRequest>) => {
    if (!branding) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await brandingService.updateUserBranding(userId, updates);
      if (result.success) {
        setSuccess('Branding settings saved successfully!');
        // Reload branding to get updated values
        await loadBranding();
      } else {
        setError(result.error || 'Failed to save branding settings');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!branding) return;

    setSaving(true);
    setError(null);

    try {
      const result = await brandingService.uploadCustomLogo(userId, file);
      if (result.success && result.url) {
        await handleSave({ custom_logo_url: result.url });
      } else {
        setError(result.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const restrictions = BRANDING_RESTRICTIONS[userTier];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading branding settings...</p>
        </div>
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-white">Failed to load branding settings</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">Branding Settings</h2>
            {userTier === 'free' && (
              <span className="px-2 py-1 bg-blue-600 text-xs text-white rounded">
                Free Tier
              </span>
            )}
            {userTier === 'premium' && (
              <span className="px-2 py-1 bg-purple-600 text-xs text-white rounded">
                Premium Tier
              </span>
            )}
            {userTier === 'unlimited' && (
              <span className="px-2 py-1 bg-yellow-600 text-xs text-white rounded">
                Unlimited
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-900/50 border border-green-500 rounded-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'colors', label: 'Colors', icon: Palette },
            { id: 'logo', label: 'Logo', icon: Upload },
            { id: 'layout', label: 'Layout', icon: Layout },
            { id: 'watermark', label: 'Watermark', icon: Eye },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Color Schemes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
                    <button
                      key={key}
                      onClick={() => handleSave({
                        primary_color: scheme.primary,
                        secondary_color: scheme.secondary,
                        accent_color: scheme.accent,
                        background_gradient: scheme.gradient
                      })}
                      disabled={!restrictions.canCustomizeColors || saving}
                      className="p-4 rounded-lg border border-gray-600 hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div 
                        className="w-full h-16 rounded mb-2"
                        style={{ 
                          background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})` 
                        }}
                      />
                      <p className="text-white text-sm font-medium">{scheme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {!restrictions.canCustomizeColors && (
                <div className="p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    Custom colors are available with Premium or Unlimited plans.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logo Tab */}
          {activeTab === 'logo' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Custom Logo</h3>
                
                {branding.custom_logo_url && (
                  <div className="mb-4">
                    <p className="text-gray-300 mb-2">Current Logo:</p>
                    <Image
                      src={branding.custom_logo_url}
                      alt="Current Logo"
                      width={branding.custom_logo_width}
                      height={branding.custom_logo_height}
                      className="border border-gray-600 rounded"
                    />
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-4">
                    Upload a custom logo for your profile
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                    disabled={!restrictions.canCustomizeLogo || saving}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`inline-block px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      restrictions.canCustomizeLogo && !saving
                        ? 'bg-white text-black hover:bg-gray-200'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saving ? 'Uploading...' : 'Choose Logo'}
                  </label>
                </div>

                {!restrictions.canCustomizeLogo && (
                  <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      Custom logos are available with Premium or Unlimited plans.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Layout Style</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(LAYOUT_STYLES).map(([key, layout]) => (
                    <button
                      key={key}
                      onClick={() => handleSave({ layout_style: key as any })}
                      disabled={!restrictions.canCustomizeLayout || saving}
                      className={`p-4 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        branding.layout_style === key
                          ? 'border-white bg-white/10'
                          : 'border-gray-600 hover:border-white'
                      }`}
                    >
                      <div className="w-full h-16 bg-gray-700 rounded mb-2" />
                      <p className="text-white text-sm font-medium">{layout.name}</p>
                      <p className="text-gray-400 text-xs">{layout.description}</p>
                    </button>
                  ))}
                </div>

                {!restrictions.canCustomizeLayout && (
                  <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      Custom layouts are available with Premium or Unlimited plans.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watermark Tab */}
          {activeTab === 'watermark' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">SoundBridge Watermark</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Show "Powered by SoundBridge"</p>
                      <p className="text-gray-400 text-sm">
                        Display SoundBridge branding on your profile
                      </p>
                    </div>
                    <button
                      onClick={() => handleSave({ show_powered_by: !branding.show_powered_by })}
                      disabled={!restrictions.canHidePoweredBy || saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        branding.show_powered_by ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          branding.show_powered_by ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Show Watermark</p>
                      <p className="text-gray-400 text-sm">
                        Display subtle SoundBridge watermark
                      </p>
                    </div>
                    <button
                      onClick={() => handleSave({ watermark_enabled: !branding.watermark_enabled })}
                      disabled={!restrictions.canHideWatermark || saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        branding.watermark_enabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          branding.watermark_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {branding.watermark_enabled && (
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Watermark Opacity: {Math.round(branding.watermark_opacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={branding.watermark_opacity}
                        onChange={(e) => handleSave({ watermark_opacity: parseFloat(e.target.value) })}
                        disabled={saving}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {(!restrictions.canHidePoweredBy || !restrictions.canHideWatermark) && (
                  <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      Hide SoundBridge branding with Premium or Unlimited plans.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            {userTier === 'free' && 'Upgrade to Premium for full customization options'}
            {userTier === 'premium' && 'You have access to all branding features'}
            {userTier === 'unlimited' && 'You have access to all branding features'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
