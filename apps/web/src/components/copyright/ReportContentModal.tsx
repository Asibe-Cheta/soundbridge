'use client';

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, AlertTriangle, Shield, Flag, User, MessageSquare } from 'lucide-react';

interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'audio_track' | 'event' | 'user';
  contentTitle?: string;
}

export default function ReportContentModal({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle
}: ReportContentModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [copyrightWorkTitle, setCopyrightWorkTitle] = useState('');
  const [copyrightWorkOwner, setCopyrightWorkOwner] = useState('');
  const [copyrightEvidence, setCopyrightEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  const reasons = [
    { 
      id: 'copyright', 
      label: '⚖️ Copyright Infringement', 
      description: 'This content uses copyrighted material without permission',
      icon: Shield,
      color: 'text-red-600'
    },
    { 
      id: 'inappropriate', 
      label: '🚫 Inappropriate Content', 
      description: 'This content violates community guidelines',
      icon: Flag,
      color: 'text-orange-600'
    },
    { 
      id: 'spam', 
      label: '📧 Spam', 
      description: 'This appears to be spam or promotional content',
      icon: MessageSquare,
      color: 'text-yellow-600'
    },
    { 
      id: 'harassment', 
      label: '😡 Harassment', 
      description: 'This content is harassing or threatening',
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    { 
      id: 'impersonation', 
      label: '🎭 Impersonation', 
      description: 'This account is impersonating someone else',
      icon: User,
      color: 'text-purple-600'
    },
    { 
      id: 'other', 
      label: '📝 Other', 
      description: 'Other violation not listed above',
      icon: Flag,
      color: 'text-gray-600'
    }
  ];

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/copyright/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          reportReason: selectedReason,
          reportDetails: details,
          reportedBy: 'current-user-id', // Get from auth context
          reporterName: reporterName || undefined,
          reporterEmail: reporterEmail || undefined,
          copyrightedWorkTitle: selectedReason === 'copyright' ? copyrightWorkTitle : undefined,
          copyrightedWorkOwner: selectedReason === 'copyright' ? copyrightWorkOwner : undefined,
          copyrightEvidence: selectedReason === 'copyright' ? copyrightEvidence : undefined
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Report submitted successfully! Reference: ${result.referenceNumber}`);
        onClose();
        // Reset form
        setSelectedReason(null);
        setDetails('');
        setCopyrightWorkTitle('');
        setCopyrightWorkOwner('');
        setCopyrightEvidence('');
        setReporterName('');
        setReporterEmail('');
      } else {
        alert(`Failed to submit report: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedReasonData = reasons.find(r => r.id === selectedReason);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-lg bg-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-2xl font-bold text-gray-900">
                Report Content
              </Dialog.Title>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contentTitle && (
              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-700">
                  Reporting: <span className="font-semibold">{contentTitle}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Content Type: {contentType.replace('_', ' ')}
                </p>
              </div>
            )}

            {/* Report Reason Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What's the issue?
              </h3>
              <div className="space-y-3">
                {reasons.map(reason => {
                  const Icon = reason.icon;
                  return (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedReason === reason.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${reason.color}`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{reason.label}</p>
                          <p className="text-sm text-gray-600">{reason.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copyright Specific Fields */}
            {selectedReason === 'copyright' && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <h3 className="text-lg font-semibold text-red-900 mb-4">
                  Copyright Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Copyrighted Work Title *
                    </label>
                    <input
                      type="text"
                      value={copyrightWorkTitle}
                      onChange={(e) => setCopyrightWorkTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter the title of the copyrighted work"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Copyright Owner *
                    </label>
                    <input
                      type="text"
                      value={copyrightWorkOwner}
                      onChange={(e) => setCopyrightWorkOwner(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter the name of the copyright owner"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evidence of Copyright
                    </label>
                    <textarea
                      value={copyrightEvidence}
                      onChange={(e) => setCopyrightEvidence(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={3}
                      placeholder="Provide evidence of your copyright ownership (registration number, publication details, etc.)"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-800 font-semibold">
                    ⚠️ False copyright claims may result in legal consequences.
                  </p>
                </div>
              </div>
            )}

            {/* Report Details */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details *
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide specific details about the violation..."
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                required
              />
            </div>

            {/* Reporter Information (Optional) */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Information (Optional)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email (optional)"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Providing your information helps us follow up on your report.
              </p>
            </div>

            {/* Selected Reason Summary */}
            {selectedReasonData && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Report Summary</h4>
                <p className="text-blue-800">
                  You are reporting this content for: <strong>{selectedReasonData.label}</strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedReasonData.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || !details || submitting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>

            {/* Legal Notice */}
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Important:</strong> By submitting this report, you confirm that the information 
                provided is accurate and that you are acting in good faith. False reports may result 
                in account restrictions.
              </p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
