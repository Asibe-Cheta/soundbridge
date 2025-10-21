'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface RightsVerificationFormProps {
  trackTitle: string;
  artistName: string;
  onVerify: (verificationData: any) => void;
  onCancel: () => void;
}

export default function RightsVerificationForm({ 
  trackTitle, 
  artistName, 
  onVerify, 
  onCancel 
}: RightsVerificationFormProps) {
  const [formData, setFormData] = useState({
    isOriginalContent: false,
    ownsRights: false,
    hasExclusiveDeals: false,
    isOnOtherPlatforms: false,
    platforms: [] as string[],
    hasSamples: false,
    sampleInfo: {
      isLicensed: false,
      licenseDetails: ''
    }
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/upload/verify-rights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackTitle,
          artistName,
          ...formData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setVerificationResult(result.data);
        onVerify(result.data);
      } else {
        console.error('Verification failed:', result.error);
        alert('Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (verificationResult) {
    return (
      <div className="space-y-6">
        {/* Verification Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Verification Results for "{trackTitle}"
          </h3>
          
          {/* Status */}
          <div className={`p-4 rounded-lg mb-4 ${
            verificationResult.canUpload 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
          }`}>
            <div className="flex items-center space-x-2">
              {verificationResult.canUpload ? (
                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              ) : (
                <XCircle className="text-red-600 dark:text-red-400" size={20} />
              )}
              <span className={`font-medium ${
                verificationResult.canUpload 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {verificationResult.canUpload ? 'Upload Approved' : 'Upload Blocked'}
              </span>
            </div>
          </div>

          {/* Violations */}
          {verificationResult.violations?.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-2 flex items-center">
                <XCircle className="mr-2" size={16} />
                Violations Found:
              </h4>
              <ul className="space-y-1">
                {verificationResult.violations.map((violation: any, index: number) => (
                  <li key={index} className="text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {violation.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {verificationResult.warnings?.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center">
                <AlertTriangle className="mr-2" size={16} />
                Warnings:
              </h4>
              <ul className="space-y-1">
                {verificationResult.warnings.map((warning: any, index: number) => (
                  <li key={index} className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {verificationResult.recommendations?.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <Info className="mr-2" size={16} />
                Recommendations:
              </h4>
              <ul className="space-y-1">
                {verificationResult.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            {verificationResult.canUpload ? (
              <button
                onClick={() => onVerify(verificationResult)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Proceed with Upload
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
              >
                Cancel Upload
              </button>
            )}
            <button
              onClick={() => setVerificationResult(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium"
            >
              Edit Information
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-300 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Rights Verification Required
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Please verify your rights to upload "{trackTitle}" by {artistName}. 
              This helps us ensure legal compliance and protect intellectual property.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Original Content */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.isOriginalContent}
              onChange={(e) => handleInputChange('isOriginalContent', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                This is my original content
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I wrote, composed, and recorded this track myself
              </p>
            </div>
          </label>
        </div>

        {/* Owns Rights */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.ownsRights}
              onChange={(e) => handleInputChange('ownsRights', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                I own the rights to this content
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I have the legal right to distribute this content (master recording + publishing rights)
              </p>
            </div>
          </label>
        </div>

        {/* Exclusive Deals */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.hasExclusiveDeals}
              onChange={(e) => handleInputChange('hasExclusiveDeals', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                I have exclusive distribution deals
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This content is subject to exclusive distribution agreements (major labels, exclusive platform deals)
              </p>
            </div>
          </label>
        </div>

        {/* Other Platforms */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.isOnOtherPlatforms}
              onChange={(e) => handleInputChange('isOnOtherPlatforms', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                This content is on other platforms
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This track is already distributed on other platforms (Spotify, Apple Music, etc.)
              </p>
            </div>
          </label>

          {formData.isOnOtherPlatforms && (
            <div className="ml-7 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Select platforms:</p>
              <div className="grid grid-cols-2 gap-2">
                {['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'TuneCore', 'CD Baby', 'DistroKid', 'SoundCloud'].map(platform => (
                  <label key={platform} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.platforms.includes(platform)}
                      onChange={() => handlePlatformToggle(platform)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{platform}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Samples */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.hasSamples}
              onChange={(e) => handleInputChange('hasSamples', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                This content contains samples
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This track includes samples from other recordings
              </p>
            </div>
          </label>

          {formData.hasSamples && (
            <div className="ml-7 space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.sampleInfo.isLicensed}
                  onChange={(e) => handleInputChange('sampleInfo', {
                    ...formData.sampleInfo,
                    isLicensed: e.target.checked
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    All samples are properly licensed
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    I have obtained proper licenses for all samples used
                  </p>
                </div>
              </label>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  License Details (Optional)
                </label>
                <textarea
                  value={formData.sampleInfo.licenseDetails}
                  onChange={(e) => handleInputChange('sampleInfo', {
                    ...formData.sampleInfo,
                    licenseDetails: e.target.value
                  })}
                  placeholder="Describe your sample licenses..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className={`px-6 py-2 rounded-lg font-medium ${
            isVerifying
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isVerifying ? 'Verifying...' : 'Verify Rights'}
        </button>
      </div>
    </div>
  );
}
