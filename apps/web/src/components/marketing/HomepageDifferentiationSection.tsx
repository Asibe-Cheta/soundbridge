'use client';

import { Sparkles } from 'lucide-react';

type HomepageDifferentiationSectionProps = {
  isDark: boolean;
};

const COMPARISONS = [
  {
    other: 'Show your music and hope someone finds it.',
    soundbridge: 'Promotes your music for free to people who have already opted in for your genre in your city.',
  },
  {
    other: 'Wait months for streaming royalties worth fractions of a penny.',
    soundbridge:
      'Your fans tip you directly while your music plays. You keep up to 90% instantly. No threshold.',
  },
  {
    other: 'Post your event and pray the algorithm shows it to the right people.',
    soundbridge:
      'Your events are promoted for free to fans who have already said they want to hear you live. Automatically.',
  },
  {
    other: 'Guess what your next career move should be.',
    soundbridge:
      'Your AI Career Adviser analyses your real data and tells you exactly which cities want you, when to release, and who to collaborate with. Coming soon.',
  },
];

export function HomepageDifferentiationSection({ isDark }: HomepageDifferentiationSectionProps) {
  return (
    <section className="mb-16" aria-labelledby="differentiation-heading">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
            isDark ? 'bg-pink-500/10 text-pink-300' : 'bg-pink-50 text-pink-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          Why SoundBridge
        </div>
        <h2
          id="differentiation-heading"
          className={`text-2xl lg:text-3xl font-bold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          SoundBridge is not a replacement for the tools you already use. It is the layer above them.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
        {COMPARISONS.map((item, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-6 ${
              isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
            }`}
          >
            <p className={`text-sm leading-relaxed line-through decoration-gray-500/60 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span className="font-medium not-italic">Other tools:</span> {item.other}
            </p>
            <p className={`mt-4 text-sm leading-relaxed font-medium ${isDark ? 'text-pink-300' : 'text-red-600'}`}>
              <span className="font-semibold">SoundBridge:</span> {item.soundbridge}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
