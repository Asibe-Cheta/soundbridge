'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Check, Bell, BellOff } from 'lucide-react';
import type { Opportunity } from './OpportunityCard';

interface ExpressInterestModalProps {
  open: boolean;
  opportunity: Opportunity;
  onClose: () => void;
  onSubmit: (data: InterestData) => Promise<void>;
  isSubscriber: boolean;
}

export interface InterestData {
  reason: 'perfect_fit' | 'interested' | 'learn_more' | 'available';
  message?: string;
  enable_alerts?: boolean;
}

const reasonOptions = [
  {
    value: 'perfect_fit' as const,
    label: 'Perfect Fit',
    description: 'This matches my skills perfectly',
  },
  {
    value: 'interested' as const,
    label: 'Very Interested',
    description: 'I\'d love to work on this',
  },
  {
    value: 'learn_more' as const,
    label: 'Want Details',
    description: 'I need more information',
  },
  {
    value: 'available' as const,
    label: 'Available Now',
    description: 'I can start immediately',
  },
];

export function ExpressInterestModal({
  open,
  opportunity,
  onClose,
  onSubmit,
  isSubscriber,
}: ExpressInterestModalProps) {
  const { theme } = useTheme();
  const [selectedReason, setSelectedReason] = useState<InterestData['reason'] | null>(null);
  const [message, setMessage] = useState('');
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    try {
      await onSubmit({
        reason: selectedReason,
        message: message.trim() || undefined,
        enable_alerts: enableAlerts || undefined,
      });
      // Reset form
      setSelectedReason(null);
      setMessage('');
      setEnableAlerts(false);
      onClose();
    } catch (error) {
      console.error('Error submitting interest:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl ${
          theme === 'dark'
            ? 'bg-gray-900/95 border-white/20'
            : 'bg-white border-gray-200'
        }`}
      >
        <DialogHeader>
          <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            Express Interest
          </DialogTitle>
          <DialogDescription
            className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
          >
            Why are you interested in "{opportunity.title}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reason Selection - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            {reasonOptions.map((option) => {
              const isSelected = selectedReason === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedReason(option.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? theme === 'dark'
                        ? 'border-pink-500 bg-pink-500/20'
                        : 'border-pink-600 bg-pink-50'
                      : theme === 'dark'
                      ? 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {isSelected && (
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-pink-500' : 'bg-pink-600'
                      }`}
                    >
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`font-semibold mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </div>
                  <div
                    className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Message */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className={`w-full rounded-lg border px-4 py-2 resize-none ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
              }`}
              placeholder="Tell them why you're interested..."
            />
            <div
              className={`text-xs mt-1 text-right ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {message.length}/500
            </div>
          </div>

          {/* Alerts Toggle (Subscribers only) */}
          {isSubscriber && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-white/5 border-white/10">
              <div className="flex items-center gap-3">
                {enableAlerts ? (
                  <Bell className={theme === 'dark' ? 'text-pink-400' : 'text-pink-600'} />
                ) : (
                  <BellOff className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                )}
                <div>
                  <div
                    className={`font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Get Alerts for Similar Opportunities
                  </div>
                  <div
                    className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    We'll notify you when similar opportunities are posted
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableAlerts(!enableAlerts)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  enableAlerts
                    ? theme === 'dark'
                      ? 'bg-pink-500'
                      : 'bg-pink-600'
                    : theme === 'dark'
                    ? 'bg-white/20'
                    : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    enableAlerts ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {!isSubscriber && (
            <div
              className={`p-4 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <div className="text-sm">
                <strong>Premium Feature:</strong> Upgrade to Premium or Unlimited to get alerts
                for similar opportunities.
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className={theme === 'dark' ? 'border-white/20' : ''}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Interest'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

