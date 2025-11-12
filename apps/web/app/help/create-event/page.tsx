'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { Calendar, ArrowLeft, CheckCircle, Ticket, Users, DollarSign } from 'lucide-react';

export default function CreateEventPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How to Create an Event</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              How to Create an Event
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Organize and promote your music events on SoundBridge
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Getting Started</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Creating an event on SoundBridge is easy! Click the <strong>"Create Event"</strong> button in the navigation bar or visit <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">/events/create</code>
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Required Information</h2>
              <div className="space-y-4">
                {[
                  { icon: Calendar, title: 'Event Title', desc: 'A catchy name for your event (e.g., "Summer Music Festival 2024")' },
                  { icon: Calendar, title: 'Date & Time', desc: 'When your event will take place. Include both date and time.' },
                  { icon: Users, title: 'Location', desc: 'Where the event will be held. You can add a venue name and address.' },
                  { icon: Ticket, title: 'Description', desc: 'Tell people what to expect. Include performers, genres, and any special details.' },
                  { icon: DollarSign, title: 'Ticket Price', desc: 'Set ticket prices (can be free or paid). You can also set a maximum number of attendees.' }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start gap-4">
                        <Icon className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                        <div>
                          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Privacy Settings</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Choose who can see your event:
              </p>
              <div className="space-y-3">
                {[
                  { type: 'Public', desc: 'Anyone can find and see your event' },
                  { type: 'Followers Only', desc: 'Only people who follow you can see the event' },
                  { type: 'Private', desc: 'Only you can see the event (useful for planning)' }
                ].map((item, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{item.type}</strong>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Publishing Your Event</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Once you've filled in all the details, you can:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span><strong>Publish Now</strong> - Make your event live immediately</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span><strong>Schedule</strong> - Set a date and time for the event to go live</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span><strong>Save as Draft</strong> - Save your work and finish later</span>
                </li>
              </ul>
            </section>

            <div className="pt-8 border-t border-gray-200 dark:border-white/10">
              <Link href="/help" className={`inline-flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <ArrowLeft className="w-4 h-4" />
                Back to Help Center
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

