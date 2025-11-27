'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onBlocked?: () => void;
  onUnblocked?: () => void;
  isCurrentlyBlocked?: boolean;
}

export function BlockUserModal({
  isOpen,
  onClose,
  userId,
  userName,
  onBlocked,
  onUnblocked,
  isCurrentlyBlocked = false
}: BlockUserModalProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBlock = async () => {
    if (!user) {
      setError('You must be logged in to block users');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          blockedUserId: userId,
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to block user');
      }

      if (onBlocked) {
        onBlocked();
      }
      onClose();
      setReason('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while blocking the user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!user) {
      setError('You must be logged in to unblock users');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/block?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to unblock user');
      }

      if (onUnblocked) {
        onUnblocked();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while unblocking the user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-xl shadow-2xl ${
          theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              }`}
            >
              <Shield
                className={`h-5 w-5 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}
              />
            </div>
            <h2
              className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              {isCurrentlyBlocked ? 'Unblock User' : 'Block User'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                theme === 'dark'
                  ? 'bg-red-900/20 border border-red-800'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}
              />
              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-800'
                }`}
              >
                {error}
              </p>
            </div>
          )}

          {isCurrentlyBlocked ? (
            <div className="space-y-4">
              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Are you sure you want to unblock <strong>{userName}</strong>? You
                will be able to see their content and interact with them again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-yellow-900/20 border border-yellow-800'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                  }`}
                >
                  <strong>What happens when you block someone:</strong>
                </p>
                <ul
                  className={`mt-2 space-y-1 text-sm list-disc list-inside ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                  }`}
                >
                  <li>You won't see their posts or content</li>
                  <li>They won't be able to message you</li>
                  <li>They won't be able to see your posts</li>
                  <li>You can unblock them anytime</li>
                </ul>
              </div>

              <div>
                <label
                  htmlFor="block-reason"
                  className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Reason (optional)
                </label>
                <textarea
                  id="block-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you blocking this user? (for your reference only)"
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-2 rounded-lg border resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-red-500'
                  } focus:outline-none focus:ring-2`}
                />
                <p
                  className={`mt-1 text-xs ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  {reason.length}/500 characters
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 p-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={isCurrentlyBlocked ? handleUnblock : handleBlock}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              isCurrentlyBlocked
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading
              ? 'Processing...'
              : isCurrentlyBlocked
              ? 'Unblock'
              : 'Block User'}
          </button>
        </div>
      </div>
    </div>
  );
}

