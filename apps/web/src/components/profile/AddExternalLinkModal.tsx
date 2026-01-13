/**
 * Add/Edit External Link Modal
 *
 * Modal for adding or editing external portfolio links
 *
 * Features:
 * - Platform selector (disabled when editing)
 * - URL input with real-time validation
 * - Display order selector
 * - Client-side validation before API call
 * - Clear error messaging
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { PLATFORM_METADATA, validateExternalLink, type PlatformType } from '@/src/lib/external-links-validation';
import type { ExternalLink } from '@/src/lib/types/external-links';

interface AddExternalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingLink?: ExternalLink | null;
}

export function AddExternalLinkModal({ isOpen, onClose, onSuccess, editingLink }: AddExternalLinkModalProps) {
  const [platformType, setPlatformType] = useState<PlatformType>('instagram');
  const [url, setUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize form with editing data
  useEffect(() => {
    if (editingLink) {
      setPlatformType(editingLink.platform_type);
      setUrl(editingLink.url);
      setDisplayOrder(editingLink.display_order);
    } else {
      setPlatformType('instagram');
      setUrl('');
      setDisplayOrder(1);
    }
    setError(null);
  }, [editingLink, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const validation = validateExternalLink(platformType, url);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const method = editingLink ? 'PUT' : 'POST';
      const endpoint = editingLink
        ? `/api/profile/external-links/${editingLink.id}`
        : '/api/profile/external-links';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform_type: platformType,
          url,
          display_order: displayOrder
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save link');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMetadata = PLATFORM_METADATA[platformType];

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-lg w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {editingLink ? 'Edit Link' : 'Add External Link'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Platform Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform
            </label>
            <select
              value={platformType}
              onChange={(e) => setPlatformType(e.target.value as PlatformType)}
              disabled={!!editingLink || loading} // Can't change platform when editing
              className="w-full bg-gray-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.entries(PLATFORM_METADATA).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.name}
                </option>
              ))}
            </select>
            {editingLink && (
              <p className="text-xs text-gray-500 mt-1">
                Platform cannot be changed. Delete and create a new link to change platform.
              </p>
            )}
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={selectedMetadata.example}
              className="w-full bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: {selectedMetadata.example}
            </p>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Order
            </label>
            <select
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="w-full bg-gray-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
              disabled={loading}
            >
              <option value={1}>First (appears first)</option>
              <option value={2}>Second (appears after first link)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the order in which this link appears on your profile
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving...' : editingLink ? 'Update Link' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
