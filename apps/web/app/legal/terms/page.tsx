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
            fontWeight: 'bold',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1rem'
          }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Last updated: June 3, 2026
          </p>
        </div>

        <div style={{ lineHeight: '1.8' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
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
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              5. Upload Validation and File Processing
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <p>
                <strong>File Validation:</strong> All uploaded content undergoes automated validation to ensure compliance with our technical requirements, copyright policies, and community guidelines.
              </p>
              <p>
                <strong>Tier-Based Limits:</strong> Storage limits vary by subscription tier: Free (250MB), Premium (2GB), and Unlimited (10GB). Free tier is storage-based (250MB, roughly 30–40 tracks); Premium and Unlimited offer higher storage and features. Processing times also vary by tier.
              </p>
              <p>
                <strong>Content Analysis:</strong> We may analyze your content using automated systems to detect copyright violations, inappropriate content, or technical issues.
              </p>
              <p>
                <strong>Processing Delays:</strong> Upload validation and processing may take time. We reserve the right to delay or reject uploads that fail validation or require manual review.
              </p>
              <p>
                <strong>File Security:</strong> Uploaded files are processed securely and stored according to our data protection standards. We may temporarily store files for validation purposes.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              6. Copyright and Intellectual Property
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
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              7. Privacy and Data Protection
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Your privacy is important to us. Please review our <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Privacy Policy</Link> to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              8. Subscription Terms and Billing
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <p>
                <strong>Subscription Plans:</strong> We offer Free, Premium (£6.99/month or £69.99/year), and Unlimited (£12.99/month or £129.99/year) subscription plans with different features, upload limits, storage capacity, and processing capabilities.
              </p>
              <p>
                <strong>Billing and Payments:</strong> Paid subscriptions are billed monthly or annually. All Premium and Unlimited plans include a 7-day money-back guarantee. You can request a full refund within 7 days of payment if you're not satisfied.
              </p>
              <p>
                <strong>Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before the next billing cycle. You can cancel your subscription at any time through your account settings.
              </p>
              <p>
                <strong>Feature Changes:</strong> We reserve the right to modify subscription features, limits, and pricing with 30 days' notice. Continued use constitutes acceptance of changes.
              </p>
              <p>
                <strong>Downgrades and Grace Period:</strong> When you downgrade from Premium or Unlimited to Free, you&apos;ll receive a 90-day grace period where all your content remains accessible. Tracks over the 250MB free tier limit are set to private (not deleted) — still accessible to you, but not public. You can re-subscribe anytime to restore public access. Nothing is deleted. Grace periods are limited to once per year to prevent abuse.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              9. Prohibited Activities
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
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              10. Limitation of Liability
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              To the maximum extent permitted by law, SoundBridge shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              11. Indemnification
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You agree to indemnify and hold harmless SoundBridge from any claims, damages, or expenses arising from your use of the Platform or violation of these terms.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              12. Changes to Terms
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              We may modify these terms at any time. We will notify users of significant changes via email or through the Platform. Continued use of the Platform after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              13. Platform Status
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              SoundBridge Live Ltd operates as a technology platform and marketplace that connects audio creators with fans, clients and collaborators. SoundBridge is not a talent agency, record label, event promoter, booking agent, employer or service provider. SoundBridge does not create, endorse, verify the quality of, or take responsibility for any content, events, services or transactions facilitated through the platform.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              14. Creator Independent Contractor Status
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              All creators, service providers and users on SoundBridge are independent third parties. They are not employees, agents, contractors or representatives of SoundBridge Live Ltd. SoundBridge bears no responsibility for the actions, content, services, events or conduct of any creator or user on the platform.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              15. Transaction Liability
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              SoundBridge facilitates payments between fans and creators as a payment intermediary only. SoundBridge does not guarantee the delivery of any content, service, experience or outcome in connection with any transaction processed through the platform. Disputes between fans and creators regarding transactions are the sole responsibility of the parties involved. SoundBridge&apos;s liability in connection with any transaction is limited to the platform fee collected on that transaction.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              16. Event Promotion Disclaimer
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              SoundBridge&apos;s intelligent event promotion service distributes event information to matched users on behalf of creators. SoundBridge does not organise, host, manage, supervise or take responsibility for any event listed or promoted on the platform. Creators who list events are solely responsible for the organisation, safety, legality and delivery of those events. SoundBridge bears no liability for any injury, loss, damage or disappointment arising from attendance at or participation in any event promoted through the platform.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              17. Content Liability and Safe Harbour
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              SoundBridge complies with the Digital Millennium Copyright Act (DMCA) and the Copyright, Designs and Patents Act 1988. SoundBridge is registered as a DMCA Designated Agent (Registration No. DMCA-1070287). We respond promptly to valid takedown notices and operate under the safe harbour provisions available to platform operators under applicable law.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Creators are solely responsible for ensuring they have the right to upload all content they submit to the platform. SoundBridge does not pre-screen content for copyright compliance and is not liable for infringing content uploaded by creators before receiving a valid takedown notice. See our <Link href="/legal/copyright" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Copyright Policy</Link> and <Link href="/legal/dmca" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>DMCA Notice and Takedown</Link> pages.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              18. Service Marketplace Disclaimer
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              The SoundBridge service marketplace connects creators who offer professional audio services with clients seeking those services. SoundBridge does not vet, endorse, guarantee or take responsibility for the quality, accuracy, professionalism or delivery of any service listed or booked through the marketplace. Any contract for services is solely between the creator and the client. SoundBridge is not a party to any service agreement.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              19. Dispute Resolution
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              In the event of a dispute between users arising from a transaction, event or service on the platform, SoundBridge may at its sole discretion assist in facilitating a resolution but is under no obligation to do so. SoundBridge&apos;s decision in any dispute assistance process is not binding and does not constitute legal arbitration. Users agree to resolve disputes directly between themselves or through appropriate legal channels.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This agreement is governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales, subject to mandatory consumer protections that may apply in your jurisdiction.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              20. Contact Information
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
                <strong>Address:</strong> United Kingdom<br/>
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
  );
}
