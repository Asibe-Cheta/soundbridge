'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

const REACH_OPTIONS = [
  { id: 'local', label: 'Mostly local (my city/area)' },
  { id: 'regional', label: 'Regional (multiple cities)' },
  { id: 'national', label: 'National' },
  { id: 'international', label: 'International / Online' },
];

interface EventOrganiserLocationStepProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export function EventOrganiserLocationStep({ isOpen, onContinue, onBack }: EventOrganiserLocationStepProps) {
  const { setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetchJsonWithAuth('/api/user/onboarding-progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          event_reach: selected,
        }),
      });
      setCurrentStep('eventOrganiser_valueDemo');
      onContinue();
    } catch (e) {
      setCurrentStep('eventOrganiser_valueDemo');
      onContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
          </button>
          <span className="text-sm text-white/70">Event Organiser</span>
        </div>
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
            What's your event reach?
          </h2>
          <p className="text-white/70 text-center mb-6">Select one</p>
          <div className="space-y-3">
            {REACH_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  selected === id
                    ? 'border-amber-500 bg-amber-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!selected || saving}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center gap-2"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
