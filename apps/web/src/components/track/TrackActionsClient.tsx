'use client';

import React, { useState } from 'react';
import { ReportButton } from '@/src/components/reporting/ReportButton';
import { Shield, Scale } from 'lucide-react';

interface TrackActionsClientProps {
  trackId: string;
  trackTitle: string;
  trackUrl: string;
  isOwner: boolean;
  moderationStatus?: string | null;
  takedownId?: string | null;
}

const TrackActionsClient: React.FC<TrackActionsClientProps> = ({
  trackId,
  trackTitle,
  trackUrl,
  isOwner,
  moderationStatus,
  takedownId,
}) => {
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [perjuryConsent, setPerjuryConsent] = useState(false);
  const [courtConsent, setCourtConsent] = useState(false);
  const [serviceAddress, setServiceAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const showTakenDownOwnerView = isOwner && moderationStatus === 'taken_down';

  const handleSubmitCounterNotice = async () => {
    setSubmitMessage(null);
    if (!takedownId) {
      setSubmitMessage('Unable to find takedown reference for this track.');
      return;
    }
    if (!statement.trim() || statement.trim().length < 20) {
      setSubmitMessage('Your statement must be at least 20 characters long.');
      return;
    }
    if (!perjuryConsent || !courtConsent) {
      setSubmitMessage('You must confirm both legal statements to submit a counter-notice.');
      return;
    }
    if (!serviceAddress.trim()) {
      setSubmitMessage('Please provide a service address where legal papers can be delivered.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/takedowns/${takedownId}/counter-notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement: statement.trim(),
          penalty_of_perjury_consent: perjuryConsent,
          court_jurisdiction_consent: courtConsent,
          service_address: serviceAddress.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setSubmitMessage(data.error || 'Failed to submit counter-notice. Please try again.');
        return;
      }

      setSubmitMessage('Your counter-notice has been submitted successfully.');
    } catch (err) {
      setSubmitMessage('Network error while submitting counter-notice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Owner view for taken-down track */}
      {showTakenDownOwnerView && (
        <div className="rounded-2xl border border-purple-400/60 bg-purple-900/40 p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-1">
              <Scale className="w-5 h-5 text-purple-200" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-700/60 text-xs font-semibold text-purple-50 mb-2">
                ⚖️ Copyright Removed
              </div>
              <p className="text-sm text-purple-50">
                Your track was removed following a copyright notice. If you believe this is a mistake, you may submit a
                counter-notice within 14 days.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCounterModalOpen(true)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium transition-colors"
          >
            <Scale className="w-4 h-4" />
            Submit Counter-Notice
          </button>
        </div>
      )}

      {/* Non-owner report button */}
      {!isOwner && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 text-xs text-gray-200">
            <Shield className="w-4 h-4 text-red-400" />
            <span>See something wrong?</span>
            <ReportButton
              contentId={trackId}
              contentType="track"
              contentTitle={trackTitle}
              contentUrl={trackUrl}
              variant="link"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Counter-notice modal */}
      {isCounterModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-xl w-full rounded-2xl bg-gray-950 text-gray-50 border border-purple-500/60 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/40">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-200" />
                <h2 className="text-sm font-semibold">Submit Counter-Notice</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCounterModalOpen(false);
                  setSubmitMessage(null);
                }}
                className="text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-sm">
              <p className="text-gray-200">
                This form is for DMCA/CDPA counter-notices under 17 U.S.C. §512(g). Only submit if you believe the
                takedown was a mistake or misidentification and you are prepared to consent to jurisdiction.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Statement <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Explain clearly why you believe the content was removed by mistake or misidentification (minimum 20 characters)..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Service address <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Full postal address where you can receive legal papers..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-xs text-gray-200">
                  <input
                    type="checkbox"
                    checked={perjuryConsent}
                    onChange={(e) => setPerjuryConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I consent to the statement being treated as made under penalty of perjury and affirm that the
                    information provided is accurate and that I am the owner of the rights or authorized to act on
                    behalf of the owner.
                  </span>
                </label>

                <label className="flex items-start gap-2 text-xs text-gray-200">
                  <input
                    type="checkbox"
                    checked={courtConsent}
                    onChange={(e) => setCourtConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I consent to the jurisdiction of the appropriate courts for the address provided above, and I will
                    accept service of process from the person who submitted the original notice or their agent.
                  </span>
                </label>
              </div>

              {submitMessage && (
                <p className="text-xs text-purple-200 bg-purple-900/40 border border-purple-600/60 rounded-lg px-3 py-2">
                  {submitMessage}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsCounterModalOpen(false);
                  setSubmitMessage(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCounterNotice}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Counter-Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackActionsClient;

