'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { User, ArrowLeft, CheckCircle, Image as ImageIcon, FileText, Globe } from 'lucide-react';

export default function SetupProfilePage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Setting Up Your Profile</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org", "@type": "Article",
            "headline": "How to Set Up Your Creator Profile on SoundBridge",
            "description": "Complete guide to setting up your SoundBridge profile. Learn how to add photos, bio, social links, and make your profile stand out."
          }) }} />

          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Setting Up Your Profile
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Make your profile stand out and attract more listeners
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Why Your Profile Matters</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your profile is like your business card on SoundBridge. It's the first thing people see when they discover your music. A complete, professional profile helps you:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Attract more listeners and followers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Build your brand and identity</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Connect with other creators</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Get discovered in search results</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profile Picture</h2>
              <div className="flex items-start gap-4 mb-6">
                <ImageIcon className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                <div>
                  <p className={`text-lg leading-relaxed mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your profile picture appears everywhere on SoundBridge - next to your tracks, comments, and when people visit your profile. Use a clear, high-quality image that represents you or your brand.
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <strong>Recommended:</strong> Square image, at least 400x400 pixels, JPG or PNG format
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Display Name</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                This is your public name on SoundBridge. It can be your real name, stage name, or band name. Choose something memorable and that represents your brand.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Bio</h2>
              <div className="flex items-start gap-4 mb-6">
                <FileText className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <p className={`text-lg leading-relaxed mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your bio is your chance to tell your story. Write about who you are, what kind of music you make, your influences, or anything that helps people connect with you.
                  </p>
                  <div className={`p-4 rounded-lg border mt-4 ${theme === 'dark' ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                    <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-green-300' : 'text-green-900'}`}>💡 Writing Tips:</p>
                    <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <li>• Keep it concise but informative (2-3 paragraphs)</li>
                      <li>• Mention your music style and influences</li>
                      <li>• Include any notable achievements or collaborations</li>
                      <li>• Add a personal touch to connect with listeners</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Location</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Adding your location helps local fans find you and can help with event promotion. You can add your city, state, or country.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Social Links</h2>
              <div className="flex items-start gap-4 mb-6">
                <Globe className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                <div>
                  <p className={`text-lg leading-relaxed mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Connect your social media accounts so fans can follow you on other platforms. You can add links to Instagram, Twitter, YouTube, TikTok, and more.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How to Edit Your Profile</h2>
              <ol className={`space-y-3 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>1</span>
                  <div>Go to your profile page by clicking your profile picture or name in the top navigation</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>2</span>
                  <div>Click the <strong>"Edit Profile"</strong> button</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>3</span>
                  <div>Update any fields you want to change</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>4</span>
                  <div>Click <strong>"Save Changes"</strong> when you're done</div>
                </li>
              </ol>
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

