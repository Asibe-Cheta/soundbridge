'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { copyrightService } from '../../lib/copyright-service';
import type { CopyrightViolationReport } from '../../lib/types/upload';

interface CopyrightReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
}

export function CopyrightReportModal({
  isOpen,
  onClose,
  trackId,
  trackTitle
}: CopyrightReportModalProps) {
  const [violationType, setViolationType] = useState<'copyright_infringement' | 'trademark' | 'rights_holder_complaint'>('copyright_infringement');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setErrorMessage('Please provide a description of the violation');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const report: CopyrightViolationReport = {
        trackId,
        reporterId: '', // Will be set by the service
        violationType,
        description: description.trim(),
        evidenceUrls: evidenceUrls.filter(url => url.trim())
      };

      const result = await copyrightService.reportViolation(report);

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
          setDescription('');
          setEvidenceUrls(['']);
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Failed to submit report');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEvidenceUrl = () => {
    setEvidenceUrls([...evidenceUrls, '']);
  };

  const removeEvidenceUrl = (index: number) => {
    if (evidenceUrls.length > 1) {
      setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
    }
  };

  const updateEvidenceUrl = (index: number, value: string) => {
    const newUrls = [...evidenceUrls];
    newUrls[index] = value;
    setEvidenceUrls(newUrls);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500" />
            <h2 className="text-xl font-semibold">Report Copyright Violation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Track Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Track Being Reported</h3>
            <p className="text-gray-600">{trackTitle}</p>
          </div>

          {/* Success/Error Messages */}
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <span className="text-green-700">Report submitted successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500" />
              <span className="text-red-700">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Violation Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type of Violation *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="violationType"
                    value="copyright_infringement"
                    checked={violationType === 'copyright_infringement'}
                    onChange={(e) => setViolationType(e.target.value as any)}
                    className="text-red-500"
                  />
                  <span>Copyright Infringement</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="violationType"
                    value="trademark"
                    checked={violationType === 'trademark'}
                    onChange={(e) => setViolationType(e.target.value as any)}
                    className="text-red-500"
                  />
                  <span>Trademark Violation</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="violationType"
                    value="rights_holder_complaint"
                    checked={violationType === 'rights_holder_complaint'}
                    onChange={(e) => setViolationType(e.target.value as any)}
                    className="text-red-500"
                  />
                  <span>Rights Holder Complaint</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description of Violation *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide a detailed description of the copyright violation..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                rows={4}
                required
              />
            </div>

            {/* Evidence URLs */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Provide links to evidence such as original work, licensing information, etc.
              </p>
              {evidenceUrls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateEvidenceUrl(index, e.target.value)}
                    placeholder="https://example.com/evidence"
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {evidenceUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvidenceUrl(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEvidenceUrl}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <Upload size={14} />
                Add another evidence link
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
