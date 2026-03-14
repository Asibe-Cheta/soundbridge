'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

const EVENT_TYPES = [
  { id: 'concerts', label: 'Concerts & Live Music 🎸' },
  { id: 'club_nights', label: 'Club Nights & DJ Sets 🎧' },
  { id: 'workshops', label: 'Workshops & Masterclasses 📚' },
  { id: 'conferences', label: 'Conferences & Talks 🎤' },
  { id: 'comedy', label: 'Comedy Shows 😂' },
  { id: 'open_mic', label: 'Open Mic Nights 🎙️' },
  { id: 'film', label: 'Film Screenings 🎬' },
  { id: 'fitness', label: 'Fitness & Wellness 🧘' },
  { id: 'art_culture', label: 'Art & Culture 🎨' },
  { id: 'networking', label: 'Networking Events 🤝' },
];

interface EventTypesStepProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export function EventTypesStep({ isOpen, onContinue, onBack }: EventTypesStepProps) {
  const { setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selected.length < 1) return;
    setSaving(true);
    try {
      await fetchJsonWithAuth('/api/user/onboarding-progress', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          preferred_event_types: selected,
        }),
      });
      setCurrentStep('eventOrganiser_location');
      onContinue();
    } catch (e) {
      setCurrentStep('eventOrganiser_location');
      onContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
          </button>
          <span className="text-sm text-white/70">Event Organiser</span>
        </div>
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
            What types of events do you organise?
          </h2>
          <p className="text-white/70 text-center mb-6">Select at least one</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {EVENT_TYPES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`px-4 py-2 rounded-full border-2 transition-all ${
                  selected.includes(id)
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
              disabled={selected.length < 1 || saving}
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
