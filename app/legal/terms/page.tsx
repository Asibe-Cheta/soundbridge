import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using SoundBridge ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                SoundBridge is a music platform that connects Christian and secular music creators with listeners. The Platform provides:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Audio file upload and streaming services</li>
                <li>Event creation and management</li>
                <li>Community features and messaging</li>
                <li>Copyright protection and content moderation</li>
                <li>Search and discovery tools</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Account Creation:</strong> You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account information.
                </p>
                <p>
                  <strong>Account Security:</strong> You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
                </p>
                <p>
                  <strong>Account Termination:</strong> You may terminate your account at any time. We may terminate your account for violations of these terms.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Content Guidelines</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>User Content:</strong> You retain ownership of content you upload, but grant us a non-exclusive license to host and distribute it.
                </p>
                <p>
                  <strong>Prohibited Content:</strong> You may not upload content that:
                </p>
                <ul className="list-disc pl-6">
                  <li>Violates copyright or intellectual property rights</li>
                  <li>Contains hate speech, harassment, or discrimination</li>
                  <li>Is illegal, harmful, or dangerous</li>
                  <li>Contains malware or spam</li>
                  <li>Violates any applicable laws or regulations</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Copyright and Intellectual Property</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Copyright Compliance:</strong> You must only upload content that you own or have proper licensing for. We have implemented copyright protection systems to detect violations.
                </p>
                <p>
                  <strong>DMCA Compliance:</strong> We comply with the Digital Millennium Copyright Act (DMCA). Copyright holders may submit takedown requests through our designated process.
                </p>
                <p>
                  <strong>Counter-Notification:</strong> If your content is removed due to a copyright claim, you may submit a counter-notification if you believe the removal was in error.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our <Link href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Prohibited Activities</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Use the Platform for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Use automated tools to access the Platform</li>
                <li>Impersonate another person or entity</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, SoundBridge shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify and hold harmless SoundBridge from any claims, damages, or expenses arising from your use of the Platform or violation of these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We may modify these terms at any time. We will notify users of significant changes via email or through the Platform. Continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@soundbridge.com<br/>
                  <strong>Address:</strong> [Your Business Address]<br/>
                  <strong>Phone:</strong> [Your Phone Number]
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
