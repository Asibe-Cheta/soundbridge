import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Flag, Copyright, Shield, MessageSquare, User, Mail } from 'lucide-react';

interface ContentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'track' | 'profile' | 'comment' | 'playlist';
  contentTitle?: string;
  contentUrl?: string;
  onOpenDMCA?: () => void;
}

const REPORT_TYPES = [
  {
    id: 'copyright_infringement',
    label: 'Copyright Infringement',
    description: 'This content violates copyright laws',
    icon: Copyright,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    id: 'spam',
    label: 'Spam',
    description: 'Repetitive, unwanted, or promotional content',
    icon: MessageSquare,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Content that violates community guidelines',
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'harassment',
    label: 'Harassment',
    description: 'Targeted abuse or harassment',
    icon: User,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    id: 'fake_content',
    label: 'Fake Content',
    description: 'Misleading or fraudulent content',
    icon: Flag,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'unauthorized_use',
    label: 'Unauthorized Use',
    description: 'Content used without permission',
    icon: Copyright,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Other violation not listed above',
    icon: AlertTriangle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
];

export const ContentReportModal: React.FC<ContentReportModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle,
  contentUrl,
  onOpenDMCA
}) => {
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'copyright' | 'submit'>('type');
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    evidenceUrls: '',
    additionalInfo: '',
    reporterName: '',
    reporterEmail: '',
    // Copyright specific
    copyrightedWorkTitle: '',
    copyrightedWorkOwner: '',
    copyrightEvidence: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; reportId?: string } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const reportData = {
        reportType: selectedReportType,
        contentType,
        contentId,
        contentTitle,
        contentUrl,
        reason: formData.reason,
        description: formData.description,
        evidenceUrls: formData.evidenceUrls ? formData.evidenceUrls.split('\n').filter(url => url.trim()) : [],
        additionalInfo: formData.additionalInfo,
        reporterName: formData.reporterName || undefined,
        reporterEmail: formData.reporterEmail || undefined,
        // Copyright specific
        copyrightedWorkTitle: formData.copyrightedWorkTitle || undefined,
        copyrightedWorkOwner: formData.copyrightedWorkOwner || undefined,
        copyrightEvidence: formData.copyrightEvidence || undefined
      };

      const response = await fetch('/api/reports/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSubmitResult({
          success: true,
          message: result.message,
          reportId: result.reportId
        });
        setCurrentStep('submit');
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit report'
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('type');
    setSelectedReportType('');
    setFormData({
      reason: '',
      description: '',
      evidenceUrls: '',
      additionalInfo: '',
      reporterName: '',
      reporterEmail: '',
      copyrightedWorkTitle: '',
      copyrightedWorkOwner: '',
      copyrightEvidence: ''
    });
    setSubmitResult(null);
    onClose();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getSelectedReportType = () => REPORT_TYPES.find(type => type.id === selectedReportType);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Flag className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Report Content
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Report Type Selection */}
          {currentStep === 'type' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                What's the issue with this content?
              </h3>
              <div className="space-y-3">
                {REPORT_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedReportType(type.id);
                        // For copyright, branch into choice between quick report vs formal DMCA
                        if (type.id === 'copyright_infringement') {
                          setCurrentStep('copyright');
                        } else {
                          setCurrentStep('details');
                        }
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${type.borderColor} ${type.bgColor} hover:scale-[1.02]`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`h-5 w-5 ${type.color}`} />
                        <div>
                          <div className={`font-medium ${type.color}`}>
                            {type.label}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1b: Copyright path selection (quick vs formal DMCA/CDPA) */}
          {currentStep === 'copyright' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentStep('type')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  How do you want to report this?
                </h3>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="w-full p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Flag className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-700">Quick report to SoundBridge</div>
                      <div className="text-sm text-red-700/80">
                        Sends this track to our moderation team as a copyright issue. Recommended if you are not the
                        rights holder or do not want to submit a formal legal notice.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onOpenDMCA) {
                      // Close this modal and open the formal DMCA notice form
                      onOpenDMCA();
                      onClose();
                    }
                  }}
                  className="w-full p-4 rounded-lg border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Copyright className="h-5 w-5 text-purple-700" />
                    <div>
                      <div className="font-semibold text-purple-800">Formal DMCA/CDPA notice</div>
                      <div className="text-sm text-purple-800/80">
                        Opens the full legal notice form required under DMCA/CDPA (17 USC 512(c)(3)). Use this if you
                        are the copyright owner or authorized agent and want a formal takedown.
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Report Details */}
          {currentStep === 'details' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentStep('type')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Provide Details
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for reporting *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Please explain why you're reporting this content..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Any additional information that might help us review this report..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evidence URLs (Optional)
                  </label>
                  <textarea
                    value={formData.evidenceUrls}
                    onChange={(e) => handleInputChange('evidenceUrls', e.target.value)}
                    placeholder="Links to evidence supporting your report (one per line)..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={2}
                  />
                </div>

                {/* Copyright specific fields */}
                {selectedReportType === 'copyright_infringement' && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Copyright Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Original Work Title *
                        </label>
                        <input
                          type="text"
                          value={formData.copyrightedWorkTitle}
                          onChange={(e) => handleInputChange('copyrightedWorkTitle', e.target.value)}
                          placeholder="Title of the original copyrighted work"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Copyright Owner *
                        </label>
                        <input
                          type="text"
                          value={formData.copyrightedWorkOwner}
                          onChange={(e) => handleInputChange('copyrightedWorkOwner', e.target.value)}
                          placeholder="Name of the copyright owner"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Copyright Evidence
                        </label>
                        <textarea
                          value={formData.copyrightEvidence}
                          onChange={(e) => handleInputChange('copyrightEvidence', e.target.value)}
                          placeholder="Evidence of copyright ownership (registration number, publication date, etc.)"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reporter Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Your Information (Optional)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={formData.reporterName}
                        onChange={(e) => handleInputChange('reporterName', e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Email
                      </label>
                      <input
                        type="email"
                        value={formData.reporterEmail}
                        onChange={(e) => handleInputChange('reporterEmail', e.target.value)}
                        placeholder="your@email.com (optional)"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Providing your contact information helps us follow up on your report if needed.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setCurrentStep('type')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.reason.trim()}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Submit Result */}
          {currentStep === 'submit' && submitResult && (
            <div className="text-center">
              {submitResult.success ? (
                <div>
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flag className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
                    Report Submitted Successfully!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {submitResult.message}
                  </p>
                  {submitResult.reportId && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reference Number: <span className="font-mono font-medium">{submitResult.reportId}</span>
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
                    Submission Failed
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {submitResult.message}
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setCurrentStep('details')}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
