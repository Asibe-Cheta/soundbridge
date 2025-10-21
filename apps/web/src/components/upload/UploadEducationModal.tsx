'use client';

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface UploadEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function UploadEducationModal({ isOpen, onClose, onContinue }: UploadEducationModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [understoodGuidelines, setUnderstoodGuidelines] = useState(false);

  if (!isOpen) return null;

  const canContinue = agreedToTerms && understoodGuidelines;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload Guidelines & Rights Verification
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Introduction */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-300 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Important: Copyright & Distribution Rights
                </h3>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  Before uploading, please verify that you have the legal right to distribute this content. 
                  SoundBridge is committed to protecting intellectual property and ensuring legal compliance.
                </p>
              </div>
            </div>
          </div>

          {/* What You CAN Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <CheckCircle className="text-green-600 mr-2" size={20} />
              ✅ You CAN Upload If:
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Original Content</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• You wrote and recorded the song</li>
                  <li>• You own the master recording rights</li>
                  <li>• You own the publishing rights</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Multi-Platform Distribution</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• Non-exclusive distribution deals (TuneCore, CD Baby)</li>
                  <li>• Content already on Spotify, Apple Music</li>
                  <li>• YouTube, SoundCloud distribution</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Licensed Content</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• Properly licensed samples</li>
                  <li>• Creative Commons licensed content</li>
                  <li>• Public domain material</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Cover Songs</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• With proper mechanical licenses</li>
                  <li>• Following platform guidelines</li>
                  <li>• Original arrangements allowed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What You CANNOT Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <XCircle className="text-red-600 mr-2" size={20} />
              ❌ You CANNOT Upload:
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Copyright Violations</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• Someone else's copyrighted material</li>
                  <li>• Unlicensed samples or beats</li>
                  <li>• Pirated or stolen content</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Exclusive Deals</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• Major label exclusive contracts</li>
                  <li>• Exclusive distribution agreements</li>
                  <li>• Content signed to other platforms exclusively</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Consequences */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Legal Consequences
                </h3>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  <li>• DMCA takedown notices</li>
                  <li>• Account suspension or termination</li>
                  <li>• Legal action from rights holders</li>
                  <li>• Platform liability issues</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Verification Process */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🔍 Our Verification Process
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Rights Check</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We verify you own the content rights
                </p>
              </div>
              <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Content Detection</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Audio fingerprinting to detect existing content
                </p>
              </div>
              <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Review Process</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manual review for flagged content
                </p>
              </div>
            </div>
          </div>

          {/* Agreement Checkboxes */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="agreedToTerms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="agreedToTerms" className="text-sm text-gray-700 dark:text-gray-300">
                <strong>I agree to the SoundBridge Terms of Service</strong> and understand that I am legally responsible for the content I upload. I confirm that I have the right to distribute this content and will not violate any copyright laws.
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="understoodGuidelines"
                checked={understoodGuidelines}
                onChange={(e) => setUnderstoodGuidelines(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="understoodGuidelines" className="text-sm text-gray-700 dark:text-gray-300">
                <strong>I have read and understood the upload guidelines</strong> above. I confirm that my content meets the requirements and I understand the consequences of uploading copyrighted material.
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className={`px-6 py-2 rounded-lg font-medium ${
              canContinue
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Upload
          </button>
        </div>
      </div>
    </div>
  );
}
