'use client';

import { useTheme } from '@/src/contexts/ThemeContext';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

const steps = [
  {
    title: 'Create Your Professional Profile',
    description: 'Showcase your role, genre, location, and credits so collaborators can understand your work fast.'
  },
  {
    title: 'Upload Your Best Work',
    description: 'Share tracks, podcasts, and demos to build credibility and attract the right opportunities.'
  },
  {
    title: 'Promote Events for Free',
    description: 'List shows and reach nearby audiences without paying for ads.'
  },
  {
    title: 'Connect with Collaborators',
    description: 'Find producers, musicians, and organizers through quality-based discovery.'
  },
  {
    title: 'Get Paid Directly',
    description: 'Keep 90-95% of your revenue from tips, sales, and services.'
  }
];

export default function HowItWorksPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">How SoundBridge Works</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            A simple, creator-first path to professional networking and better monetization.
          </p>
        </div>

        <div className="grid gap-6">
          {steps.map((step) => (
            <div
              key={step.title}
              className="flex gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6"
            >
              <div className="mt-1">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h2>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
      </main>
    </div>
  );
}
