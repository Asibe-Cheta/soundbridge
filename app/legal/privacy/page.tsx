'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'var(--card-bg)',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: 'var(--card-shadow)',
        border: 'var(--card-border)'
      }}>
        {/* Back to Home */}
        <Link 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '25px',
            border: '2px solid var(--border-color)',
            transition: 'all 0.3s ease',
            marginBottom: '2rem'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1rem'
          }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Last updated: January 1, 2025
          </p>
        </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                SoundBridge ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our music platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We collect information you provide directly to us:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Name, email address, and username</li>
                <li>Profile information and preferences</li>
                <li>Payment information (when applicable)</li>
                <li>Communications with us</li>
                <li>Content you upload (audio files, images, etc.)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Usage Information</h3>
              <p className="text-gray-700 mb-4">We automatically collect certain information about your use of the Platform:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Listening history and preferences</li>
                <li>Search queries and interactions</li>
                <li>Device information and IP address</li>
                <li>Browser type and operating system</li>
                <li>Pages visited and time spent</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Cookies and Tracking</h3>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide and maintain the Platform</li>
                <li>Process your uploads and manage your content</li>
                <li>Personalize your experience and recommendations</li>
                <li>Communicate with you about your account</li>
                <li>Detect and prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
                <li>Improve our services and develop new features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
              <p className="text-gray-700 mb-4">We do not sell, trade, or rent your personal information. We may share your information in the following circumstances:</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We may share information with trusted third-party service providers who assist us in operating the Platform, such as hosting, analytics, and payment processing.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose information if required by law, court order, or government request, or to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication</li>
                <li>Secure data centers and infrastructure</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights (GDPR)</h2>
              <p className="text-gray-700 mb-4">If you are in the European Union, you have the following rights:</p>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <strong>Right to Access:</strong> You can request a copy of your personal data.
                </div>
                <div>
                  <strong>Right to Rectification:</strong> You can request correction of inaccurate data.
                </div>
                <div>
                  <strong>Right to Erasure:</strong> You can request deletion of your personal data.
                </div>
                <div>
                  <strong>Right to Portability:</strong> You can request transfer of your data to another service.
                </div>
                <div>
                  <strong>Right to Object:</strong> You can object to processing of your data.
                </div>
                <div>
                  <strong>Right to Restriction:</strong> You can request limitation of data processing.
                </div>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                To exercise these rights, please contact us at contact@soundbridge.live.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your information for as long as necessary to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide our services</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes</li>
                <li>Enforce our agreements</li>
              </ul>
              <p className="text-gray-700 mb-4">
                When you delete your account, we will delete or anonymize your personal information, except where retention is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our Platform is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Third-Party Links</h2>
              <p className="text-gray-700 mb-4">
                Our Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through the Platform. Your continued use of the Platform after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem'
              }}>
                12. Contact Us
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div style={{
                background: 'var(--card-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  <strong>Email:</strong> contact@soundbridge.live<br/>
                  <strong>Address:</strong> Wokingham, United Kingdom<br/>
                  <strong>Privacy Email:</strong> privacy@soundbridge.live<br/>
                  <strong>Data Protection Officer:</strong> dpo@soundbridge.live
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Cookie Policy</h2>
              <p className="text-gray-700 mb-4">We use the following types of cookies:</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Essential Cookies</h3>
              <p className="text-gray-700 mb-4">Required for basic platform functionality.</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics Cookies</h3>
              <p className="text-gray-700 mb-4">Help us understand how users interact with the Platform.</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Preference Cookies</h3>
              <p className="text-gray-700 mb-4">Remember your settings and preferences.</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Marketing Cookies</h3>
              <p className="text-gray-700 mb-4">Used for targeted advertising and content.</p>
            </section>
          </div>

          <div style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <Link 
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                border: '2px solid var(--accent-primary)',
                borderRadius: '25px',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                background: 'var(--accent-primary)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
