'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Last updated: January 1, 2025
          </p>
        </div>

          <div style={{ lineHeight: '1.8', fontSize: '1rem' }}>
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem'
              }}>
                1. Acceptance of Terms
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                By accessing and using SoundBridge ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
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
                2. Description of Service
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                SoundBridge is a music platform that connects Christian and secular music creators with listeners. The Platform provides:
              </p>
              <ul style={{ 
                listStyle: 'disc', 
                paddingLeft: '1.5rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '1rem' 
              }}>
                <li>Audio file upload and streaming services</li>
                <li>Event creation and management</li>
                <li>Community features and messaging</li>
                <li>Copyright protection and content moderation</li>
                <li>Search and discovery tools</li>
              </ul>
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
                3. User Accounts
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
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

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem'
              }}>
                4. Content Guidelines
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <p>
                  <strong>User Content:</strong> You retain ownership of content you upload, but grant us a non-exclusive license to host and distribute it.
                </p>
                <p>
                  <strong>Prohibited Content:</strong> You may not upload content that:
                </p>
                <ul style={{ 
                  listStyle: 'disc', 
                  paddingLeft: '1.5rem', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '1rem' 
                }}>
                  <li>Violates copyright or intellectual property rights</li>
                  <li>Contains hate speech, harassment, or discrimination</li>
                  <li>Is illegal, harmful, or dangerous</li>
                  <li>Contains malware or spam</li>
                  <li>Violates any applicable laws or regulations</li>
                </ul>
              </div>
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
                5. Copyright and Intellectual Property
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
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

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem'
              }}>
                6. Privacy and Data Protection
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Your privacy is important to us. Please review our <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Privacy Policy</Link> to understand how we collect, use, and protect your information.
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
                7. Prohibited Activities
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You agree not to:</p>
              <ul style={{ 
                listStyle: 'disc', 
                paddingLeft: '1.5rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '1rem' 
              }}>
                <li>Use the Platform for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Use automated tools to access the Platform</li>
                <li>Impersonate another person or entity</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
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
                8. Limitation of Liability
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                To the maximum extent permitted by law, SoundBridge shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use.
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
                9. Indemnification
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                You agree to indemnify and hold harmless SoundBridge from any claims, damages, or expenses arising from your use of the Platform or violation of these terms.
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
                10. Changes to Terms
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                We may modify these terms at any time. We will notify users of significant changes via email or through the Platform. Continued use of the Platform after changes constitutes acceptance of the new terms.
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
                11. Governing Law
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                These terms are governed by the laws of the United Kingdom. Any disputes shall be resolved in the courts of the United Kingdom.
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
                12. Contact Information
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                If you have questions about these Terms of Service, please contact us at:
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
                  <strong>Legal Email:</strong> legal@soundbridge.live
                </p>
              </div>
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
