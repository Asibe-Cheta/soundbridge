'use client';

import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  contentType: 'post' | 'comment';
}

const reportReasons = [
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'inappropriate_content', label: 'Inappropriate or offensive content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'fake_content', label: 'Fake or misleading information' },
  { value: 'copyright_infringement', label: 'Copyright infringement' },
  { value: 'other', label: 'Other violation' }
];

export function ReportPostModal({
  isOpen,
  onClose,
  postId,
  postTitle,
  contentType
}: ReportPostModalProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      setError('Please provide details about the violation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reportType: selectedReason,
          contentType: contentType === 'post' ? 'comment' : 'comment', // Using 'comment' as posts are stored as comments in content_reports
          contentId: postId,
          contentTitle: postTitle,
          reason: reportReasons.find(r => r.value === selectedReason)?.label || selectedReason,
          description: description.trim() || undefined,
          reporterName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          reporterEmail: user?.email
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSelectedReason('');
        setDescription('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the report');
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
              <Flag
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
              Report {contentType === 'post' ? 'Post' : 'Comment'}
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
          {success ? (
            <div
              className={`p-4 rounded-lg text-center ${
                theme === 'dark'
                  ? 'bg-green-900/20 border border-green-800'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-800'
                }`}
              >
                ✓ Report submitted successfully. Our team will review it shortly.
              </p>
            </div>
          ) : (
            <>
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

              <div>
                <label
                  className={`block text-sm font-medium mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Why are you reporting this {contentType}?
                </label>
                <div className="space-y-2">
                  {reportReasons.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        theme === 'dark'
                          ? selectedReason === reason.value
                            ? 'bg-red-900/30 border border-red-800'
                            : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                          : selectedReason === reason.value
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mr-3"
                      />
                      <span
                        className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {reason.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {(selectedReason === 'other' || selectedReason) && (
                <div>
                  <label
                    htmlFor="report-description"
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Additional details (optional)
                  </label>
                  <textarea
                    id="report-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please provide more information about the violation..."
                    rows={4}
                    maxLength={1000}
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
                    {description.length}/1000 characters
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
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
              onClick={handleSubmit}
              disabled={isLoading || !selectedReason}
              className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

