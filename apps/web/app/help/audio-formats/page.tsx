'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { FileAudio, ArrowLeft, CheckCircle } from 'lucide-react';

export default function AudioFormatsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Supported Audio Formats</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <FileAudio className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Supported Audio Formats
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Learn which audio file formats you can upload to SoundBridge
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Supported Formats</h2>
              <p className={`text-lg leading-relaxed mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                SoundBridge accepts the following audio file formats:
              </p>
              <div className="space-y-4">
                {[
                  { format: 'MP3', desc: 'Most common format, works everywhere, smaller file sizes', quality: 'Good' },
                  { format: 'WAV', desc: 'Uncompressed, highest quality, larger file sizes', quality: 'Best' },
                  { format: 'FLAC', desc: 'Lossless compression, high quality, smaller than WAV', quality: 'Best' },
                  { format: 'AAC', desc: 'Good quality, smaller than MP3, used by Apple devices', quality: 'Good' },
                  { format: 'OGG', desc: 'Open source format, good compression', quality: 'Good' }
                ].map((fmt, i) => (
                  <div key={i} className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{fmt.format}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        {fmt.quality}
                      </span>
                    </div>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{fmt.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recommended Settings</h2>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-semibold mb-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>💡 Best Practices:</p>
                <ul className={`space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span><strong>For best quality:</strong> Upload WAV or FLAC files</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span><strong>For faster uploads:</strong> Use MP3 at 320 kbps or higher</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span><strong>File size limit:</strong> Maximum 500MB per file</span>
                  </li>
                </ul>
              </div>
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

