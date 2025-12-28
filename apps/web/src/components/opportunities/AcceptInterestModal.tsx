'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import type { Interest } from './InterestCard';

interface AcceptInterestModalProps {
  open: boolean;
  interest: Interest;
  onClose: () => void;
  onSubmit: (customMessage: string) => Promise<void>;
}

const quickMessageTemplates = [
  "Great! Let's connect and discuss the details.",
  "Excellent! I'd love to work with you on this opportunity.",
  "Perfect! Let's schedule a call to go over the next steps.",
];

export function AcceptInterestModal({
  open,
  interest,
  onClose,
  onSubmit,
}: AcceptInterestModalProps) {
  const { theme } = useTheme();
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTemplateSelect = (index: number) => {
    setSelectedTemplate(index);
    setCustomMessage(quickMessageTemplates[index]);
  };

  const handleSubmit = async () => {
    if (!customMessage.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(customMessage.trim());
      setCustomMessage('');
      setSelectedTemplate(null);
      onClose();
    } catch (error) {
      console.error('Error accepting interest:', error);
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
            Accept Interest
          </DialogTitle>
          <DialogDescription
            className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
          >
            Send a message to {interest.interested_user.display_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Preview */}
          <div
            className={`flex items-center gap-4 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <Avatar className="w-16 h-16">
              <AvatarImage src={interest.interested_user.avatar_url || undefined} />
              <AvatarFallback>
                {interest.interested_user.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {interest.interested_user.display_name}
              </h3>
              {interest.interested_user.headline && (
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {interest.interested_user.headline}
                </p>
              )}
            </div>
          </div>

          {/* Quick Message Templates */}
          <div>
            <label
              className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Quick Messages (or write your own)
            </label>
            <div className="space-y-2">
              {quickMessageTemplates.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTemplateSelect(index)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedTemplate === index
                      ? theme === 'dark'
                        ? 'border-pink-500 bg-pink-500/20'
                        : 'border-pink-600 bg-pink-50'
                      : theme === 'dark'
                      ? 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {template}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Your Message
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setSelectedTemplate(null);
              }}
              maxLength={1000}
              rows={5}
              className={`w-full rounded-lg border px-4 py-2 resize-none ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
              }`}
              placeholder="Write a personalized message to accept their interest..."
            />
            <div
              className={`text-xs mt-1 text-right ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {customMessage.length}/1000
            </div>
          </div>
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
            disabled={!customMessage.trim() || submitting}
          >
            {submitting ? 'Sending...' : 'Send & Accept'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

