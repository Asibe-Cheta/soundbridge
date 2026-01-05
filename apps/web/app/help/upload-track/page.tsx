'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { Upload, ArrowLeft, CheckCircle, Music, FileAudio } from 'lucide-react';

export default function UploadTrackPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Uploading Your First Track</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org", "@type": "Article",
            "headline": "How to Upload Your First Track on SoundBridge",
            "description": "Complete guide to uploading music tracks on SoundBridge. Learn about supported formats, adding metadata, cover art, and publishing your music."
          }) }} />

          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Uploading Your First Track
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Share your music with the world in just a few clicks
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 1: Go to Upload Page</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Click the <strong>"Upload"</strong> button in the navigation bar, or visit <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">/upload</code>. Make sure you're logged in to your account.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 2: Select Your Audio File</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Click the upload area or drag and drop your audio file. SoundBridge supports MP3, WAV, FLAC, and other common audio formats. The file will start uploading automatically.
              </p>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>💡 Tip:</p>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  For best quality, upload WAV or FLAC files. MP3 is fine for most listeners and uploads faster.
                </p>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 3: Add Track Information</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                While your file uploads, fill in the track details:
              </p>
              <ul className={`space-y-3 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <strong>Track Title</strong> - The name of your song (required)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <strong>Artist Name</strong> - Your stage name or band name
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <strong>Genre</strong> - Select the music genre (helps listeners find your music)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <strong>Description</strong> - Tell listeners about your track (optional but recommended)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <strong>Tags</strong> - Add keywords to help people discover your music
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 4: Add Cover Art</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload a cover image for your track. This is the image that will appear when people see your track. Recommended size is 1000x1000 pixels, and it should be a square image (JPG or PNG format).
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 5: Cover Songs and ISRC Codes</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                If you're uploading a cover song (a song originally written and recorded by another artist), you must provide an ISRC (International Standard Recording Code) for copyright compliance.
              </p>
              <div className={`p-6 rounded-lg border mb-6 ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'}`}>⚠️ Important:</p>
                <ul className={`space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Cover songs require a valid ISRC code before they can be uploaded</li>
                  <li>• The ISRC format is: <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">XX-XXX-YY-NNNNN</code> (12 characters)</li>
                  <li>• We verify ISRC codes through the MusicBrainz database</li>
                  <li>• If you don't have an ISRC code, obtain one from your music distributor (DistroKid, CD Baby, TuneCore, etc.) or a music industry organization</li>
                  <li>• Original compositions do NOT require ISRC codes</li>
                </ul>
              </div>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                When uploading a cover song, check the "This is a cover song" checkbox and enter your ISRC code. Our system will verify it automatically before allowing the upload to proceed.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 6: Choose Privacy Settings</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Decide who can see your track:
              </p>
              <div className="space-y-3 mb-6">
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Public</strong>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Anyone can find and listen to your track
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Private</strong>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Only you can see and access the track
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step 7: Publish Your Track</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Once everything is filled in and your file has finished uploading, click <strong>"Publish"</strong> or <strong>"Save as Draft"</strong> if you want to finish later. Your track will be live on SoundBridge!
              </p>
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

