'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Camera,
  Upload,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  User,
  Layers,
  Star,
  CreditCard
} from 'lucide-react';

export default function ServiceVerificationPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-8 lg:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link 
                href="/help" 
                className={`hover:underline ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li>
              <Link 
                href="/help/service-verification" 
                className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Getting Verified as a Provider
              </Link>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-600 to-blue-500 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Getting Verified as a Service Provider
          </h1>
          <p className={`text-lg lg:text-xl max-w-3xl ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Learn how to get verified on SoundBridge and earn a verification badge that builds trust with clients and helps you stand out.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* What is Verification */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              What is Verification?
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <p className={`text-lg leading-relaxed mb-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Verification is a process that confirms your identity as a service provider. When you're verified, you get a special badge on your profile that shows clients you're a trusted professional.
              </p>
              <div className={`p-6 rounded-lg border mb-6 ${
                theme === 'dark'
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <Sparkles className={`w-6 h-6 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <div>
                    <p className={`font-semibold mb-2 ${
                      theme === 'dark' ? 'text-green-300' : 'text-green-900'
                    }`}>
                      Benefits of Verification:
                    </p>
                    <ul className={`space-y-2 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <li>✅ Verification badge appears on your profile</li>
                      <li>✅ Higher visibility in search results</li>
                      <li>✅ Increased client trust and booking rates</li>
                      <li>✅ Access to premium features and opportunities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Verification Requirements
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <p className={`text-lg leading-relaxed mb-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Before you can submit a verification request, you need to complete these prerequisites:
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: 'Complete Profile',
                    description: 'Fill out your display name, headline, bio, and select service categories.',
                    icon: User
                  },
                  {
                    title: 'Active Service Offering',
                    description: 'Publish at least one active service offering with pricing.',
                    icon: Layers
                  },
                  {
                    title: 'Portfolio Items',
                    description: 'Add at least one portfolio item showcasing your work.',
                    icon: Upload
                  },
                  {
                    title: 'Completed Bookings',
                    description: 'Complete at least one booking successfully (optional but recommended).',
                    icon: CheckCircle
                  },
                  {
                    title: 'Average Rating',
                    description: 'Maintain a good average rating from client reviews.',
                    icon: Star
                  },
                  {
                    title: 'Stripe Payouts Ready',
                    description: 'Connect your Stripe account for receiving payments.',
                    icon: CreditCard
                  }
                ].map((req, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <req.icon className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold mb-1 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {req.title}
                        </h3>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {req.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How to Submit */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              How to Submit Verification
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <ol className={`space-y-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    1
                  </span>
                  <div>
                    <strong>Complete All Prerequisites</strong> - Make sure you've met all the requirements listed above. You can check your progress in the Verification section of your dashboard.
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    2
                  </span>
                  <div>
                    <strong>Prepare Your Documents</strong> - You'll need:
                    <ul className={`mt-2 space-y-1 ml-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <li>• Government-issued ID (driver's license, passport, etc.)</li>
                      <li>• Selfie holding your ID</li>
                      <li>• Optional: Business registration document (if applicable)</li>
                    </ul>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    3
                  </span>
                  <div>
                    <strong>Upload Documents</strong> - In your Service Provider dashboard, go to the Verification section and upload:
                    <ul className={`mt-2 space-y-1 ml-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <li>• Government ID image (clear, readable)</li>
                      <li>• Selfie with ID (your face and ID both visible)</li>
                      <li>• Business document (if you have one)</li>
                    </ul>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    4
                  </span>
                  <div>
                    <strong>Add Notes (Optional)</strong> - Include any additional information that might help with verification, such as your business website or professional credentials.
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    5
                  </span>
                  <div>
                    <strong>Submit Request</strong> - Click "Submit Verification Request" and wait for review. Our team aims to respond within 3 business days.
                  </div>
                </li>
              </ol>
            </div>
          </section>

          {/* Status */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Verification Status
            </h2>
            <div className="space-y-4">
              {[
                {
                  status: 'Not Requested',
                  description: 'You haven\'t submitted a verification request yet. Complete the prerequisites to get started.',
                  icon: HelpCircle,
                  color: 'gray'
                },
                {
                  status: 'Pending Review',
                  description: 'Your verification request is being reviewed by our team. We aim to respond within 3 business days.',
                  icon: Clock,
                  color: 'yellow'
                },
                {
                  status: 'Approved',
                  description: 'Congratulations! You\'re verified. Your badge is live on your profile.',
                  icon: CheckCircle,
                  color: 'green'
                },
                {
                  status: 'Rejected',
                  description: 'We found an issue with your submission. Review the feedback and submit an updated request.',
                  icon: AlertCircle,
                  color: 'red'
                }
              ].map((item, index) => (
                <div key={index} className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.color === 'green' 
                        ? theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                        : item.color === 'yellow'
                        ? theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100'
                        : item.color === 'red'
                        ? theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                        : theme === 'dark' ? 'bg-gray-500/20' : 'bg-gray-100'
                    }`}>
                      <item.icon className={`w-6 h-6 ${
                        item.color === 'green'
                          ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          : item.color === 'yellow'
                          ? theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                          : item.color === 'red'
                          ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {item.status}
                      </h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Tips for Successful Verification
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <ul className={`space-y-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li>📸 <strong>Clear Photos:</strong> Make sure your ID and selfie are clear, well-lit, and readable. Avoid blurry or dark images.</li>
                <li>📄 <strong>Valid ID:</strong> Use a current, government-issued ID that hasn't expired.</li>
                <li>👤 <strong>Match Your Profile:</strong> The name on your ID should match your profile name (or be clearly related).</li>
                <li>💼 <strong>Complete Profile:</strong> A complete, professional profile increases your chances of approval.</li>
                <li>⭐ <strong>Good Reviews:</strong> Having positive reviews from clients helps demonstrate your legitimacy.</li>
                <li>📝 <strong>Add Context:</strong> Use the notes field to explain any discrepancies or provide additional context.</li>
              </ul>
            </div>
          </section>

          {/* Related Articles */}
          <section>
            <div className={`p-6 rounded-xl border ${
              theme === 'dark'
                ? 'bg-white/5 backdrop-blur-lg border-white/10'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <h3 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Related Articles
              </h3>
              <div className="space-y-2">
                <Link 
                  href="/help/service-provider-guide" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Complete Service Provider Guide
                </Link>
                <Link 
                  href="/help/service-bookings" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Managing Bookings and Payments
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

