import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copyright, AlertTriangle, CheckCircle, FileText, User, Mail, Phone, MapPin } from 'lucide-react';

interface DMCAFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId?: string;
  contentTitle?: string;
  contentUrl?: string;
}

export const DMCAFormModal: React.FC<DMCAFormModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  contentUrl
}) => {
  const [currentStep, setCurrentStep] = useState<'info' | 'content' | 'copyright' | 'legal' | 'submit'>('info');
  const [formData, setFormData] = useState({
    // Complainant Information
    complainantName: '',
    complainantEmail: '',
    complainantPhone: '',
    complainantAddress: '',
    complainantType: 'copyright_owner' as 'copyright_owner' | 'authorized_agent' | 'legal_representative',
    
    // Content Information
    contentId: contentId || '',
    contentTitle: contentTitle || '',
    contentUrl: contentUrl || '',
    infringingUrls: '',
    
    // Copyright Information
    copyrightedWorkTitle: '',
    copyrightedWorkAuthor: '',
    copyrightedWorkCopyrightOwner: '',
    copyrightedWorkRegistrationNumber: '',
    copyrightedWorkDateCreated: '',
    
    // Legal Declarations
    goodFaithBelief: false,
    accuracyStatement: false,
    perjuryPenalty: false,
    authorizedAgent: false,
    
    // Request Details
    description: '',
    evidenceUrls: '',
    requestType: 'takedown' as 'takedown' | 'counter_notice',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; requestId?: string } | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const dmcaData = {
        complainantName: formData.complainantName,
        complainantEmail: formData.complainantEmail,
        complainantPhone: formData.complainantPhone || undefined,
        complainantAddress: formData.complainantAddress || undefined,
        complainantType: formData.complainantType,
        
        contentId: formData.contentId,
        contentTitle: formData.contentTitle || undefined,
        contentUrl: formData.contentUrl || undefined,
        infringingUrls: formData.infringingUrls ? formData.infringingUrls.split('\n').filter(url => url.trim()) : undefined,
        
        copyrightedWorkTitle: formData.copyrightedWorkTitle,
        copyrightedWorkAuthor: formData.copyrightedWorkAuthor,
        copyrightedWorkCopyrightOwner: formData.copyrightedWorkCopyrightOwner,
        copyrightedWorkRegistrationNumber: formData.copyrightedWorkRegistrationNumber || undefined,
        copyrightedWorkDateCreated: formData.copyrightedWorkDateCreated || undefined,
        
        goodFaithBelief: formData.goodFaithBelief,
        accuracyStatement: formData.accuracyStatement,
        perjuryPenalty: formData.perjuryPenalty,
        authorizedAgent: formData.authorizedAgent,
        
        description: formData.description,
        evidenceUrls: formData.evidenceUrls ? formData.evidenceUrls.split('\n').filter(url => url.trim()) : undefined,
        requestType: formData.requestType,
        priority: formData.priority
      };

      const response = await fetch('/api/dmca/takedown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dmcaData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSubmitResult({
          success: true,
          message: result.message,
          requestId: result.requestId
        });
        setCurrentStep('submit');
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit DMCA request'
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
    setCurrentStep('info');
    setFormData({
      complainantName: '',
      complainantEmail: '',
      complainantPhone: '',
      complainantAddress: '',
      complainantType: 'copyright_owner',
      contentId: contentId || '',
      contentTitle: contentTitle || '',
      contentUrl: contentUrl || '',
      infringingUrls: '',
      copyrightedWorkTitle: '',
      copyrightedWorkAuthor: '',
      copyrightedWorkCopyrightOwner: '',
      copyrightedWorkRegistrationNumber: '',
      copyrightedWorkDateCreated: '',
      goodFaithBelief: false,
      accuracyStatement: false,
      perjuryPenalty: false,
      authorizedAgent: false,
      description: '',
      evidenceUrls: '',
      requestType: 'takedown',
      priority: 'normal'
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

  const isStepValid = (step: string): boolean => {
    switch (step) {
      case 'info':
        return formData.complainantName.trim() !== '' && 
               formData.complainantEmail.trim() !== '' && 
               formData.complainantType !== '';
      case 'content':
        return formData.contentId.trim() !== '' && 
               formData.contentTitle.trim() !== '';
      case 'copyright':
        return formData.copyrightedWorkTitle.trim() !== '' && 
               formData.copyrightedWorkAuthor.trim() !== '' && 
               formData.copyrightedWorkCopyrightOwner.trim() !== '';
      case 'legal':
        return formData.goodFaithBelief && 
               formData.accuracyStatement && 
               formData.perjuryPenalty && 
               formData.authorizedAgent &&
               formData.description.trim() !== '';
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Copyright className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              DMCA Takedown Request
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {['info', 'content', 'copyright', 'legal', 'submit'].map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = ['info', 'content', 'copyright', 'legal'].indexOf(currentStep) > index;
              const stepNames = ['Your Info', 'Content', 'Copyright', 'Legal', 'Submit'];
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : isCompleted 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {stepNames[index]}
                  </span>
                  {index < 4 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Complainant Information */}
          {currentStep === 'info' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Your Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.complainantName}
                    onChange={(e) => handleInputChange('complainantName', e.target.value)}
                    placeholder="Your full legal name"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.complainantEmail}
                    onChange={(e) => handleInputChange('complainantEmail', e.target.value)}
                    placeholder="your@email.com"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.complainantPhone}
                    onChange={(e) => handleInputChange('complainantPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Physical Address
                  </label>
                  <textarea
                    value={formData.complainantAddress}
                    onChange={(e) => handleInputChange('complainantAddress', e.target.value)}
                    placeholder="Your physical mailing address"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Role *
                  </label>
                  <select
                    value={formData.complainantType}
                    onChange={(e) => handleInputChange('complainantType', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="copyright_owner">Copyright Owner</option>
                    <option value="authorized_agent">Authorized Agent</option>
                    <option value="legal_representative">Legal Representative</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setCurrentStep('content')}
                  disabled={!isStepValid('info')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Content Information */}
          {currentStep === 'content' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentStep('info')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Content Information
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content ID *
                  </label>
                  <input
                    type="text"
                    value={formData.contentId}
                    onChange={(e) => handleInputChange('contentId', e.target.value)}
                    placeholder="Content identifier or URL"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Title *
                  </label>
                  <input
                    type="text"
                    value={formData.contentTitle}
                    onChange={(e) => handleInputChange('contentTitle', e.target.value)}
                    placeholder="Title of the infringing content"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content URL
                  </label>
                  <input
                    type="url"
                    value={formData.contentUrl}
                    onChange={(e) => handleInputChange('contentUrl', e.target.value)}
                    placeholder="https://soundbridge.live/track/..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Infringing URLs
                  </label>
                  <textarea
                    value={formData.infringingUrls}
                    onChange={(e) => handleInputChange('infringingUrls', e.target.value)}
                    placeholder="Additional URLs where this content appears (one per line)"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('info')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('copyright')}
                  disabled={!isStepValid('content')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Copyright Information */}
          {currentStep === 'copyright' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentStep('content')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Copyright Information
                </h3>
              </div>
              
              <div className="space-y-4">
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
                    Original Author *
                  </label>
                  <input
                    type="text"
                    value={formData.copyrightedWorkAuthor}
                    onChange={(e) => handleInputChange('copyrightedWorkAuthor', e.target.value)}
                    placeholder="Name of the original author/creator"
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
                    value={formData.copyrightedWorkCopyrightOwner}
                    onChange={(e) => handleInputChange('copyrightedWorkCopyrightOwner', e.target.value)}
                    placeholder="Name of the copyright owner"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.copyrightedWorkRegistrationNumber}
                      onChange={(e) => handleInputChange('copyrightedWorkRegistrationNumber', e.target.value)}
                      placeholder="Copyright registration number"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date Created
                    </label>
                    <input
                      type="date"
                      value={formData.copyrightedWorkDateCreated}
                      onChange={(e) => handleInputChange('copyrightedWorkDateCreated', e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('content')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('legal')}
                  disabled={!isStepValid('copyright')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Legal Declarations */}
          {currentStep === 'legal' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCurrentStep('copyright')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Legal Declarations
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description of Infringement *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe how the content infringes on your copyright..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evidence URLs
                  </label>
                  <textarea
                    value={formData.evidenceUrls}
                    onChange={(e) => handleInputChange('evidenceUrls', e.target.value)}
                    placeholder="Links to evidence supporting your claim (one per line)"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                  />
                </div>

                {/* Legal Declarations */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Legal Declarations (Required)
                  </h4>
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.goodFaithBelief}
                        onChange={(e) => handleInputChange('goodFaithBelief', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.accuracyStatement}
                        onChange={(e) => handleInputChange('accuracyStatement', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        The information in this notification is accurate, and under penalty of perjury, I am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.perjuryPenalty}
                        onChange={(e) => handleInputChange('perjuryPenalty', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I understand that making a false claim may result in liability for damages, including costs and attorney's fees.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.authorizedAgent}
                        onChange={(e) => handleInputChange('authorizedAgent', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep('copyright')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isStepValid('legal')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit DMCA Request'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Submit Result */}
          {currentStep === 'submit' && submitResult && (
            <div className="text-center">
              {submitResult.success ? (
                <div>
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
                    DMCA Request Submitted Successfully!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {submitResult.message}
                  </p>
                  {submitResult.requestId && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Request ID: <span className="font-mono font-medium">{submitResult.requestId}</span>
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      We will review your request and take appropriate action within 24-72 hours for urgent requests, or within 7 days for normal priority requests.
                    </p>
                  </div>
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
                      onClick={() => setCurrentStep('legal')}
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
