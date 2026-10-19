import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Partner Programme Terms & Policies - SoundBridge',
  description:
    'The full terms and policies governing the SoundBridge Partner Collaboration Programme, including benefits, commission, term, and how this relates to our Terms of Service and Privacy Policy.',
  robots: { index: false, follow: false },
};

export default function PartnerProgrammePoliciesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        color: 'var(--text-primary)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'var(--card-bg)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: 'var(--card-shadow)',
          border: 'var(--card-border)',
        }}
      >
        <Link
          href="/agreement/partner"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '25px',
            border: '2px solid var(--border-color)',
            marginBottom: '2rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Partner Agreement
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontWeight: 'bold',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
            }}
          >
            Partner Programme Terms &amp; Policies
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Last updated: 19 October 2026</p>
        </div>

        <div style={{ lineHeight: '1.8' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              1. About This Document
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This page sets out the full terms of the SoundBridge Partner Collaboration Programme
              ("the Programme"), so you can read everything before you sign. It is provided for
              your review ahead of signing the{' '}
              <Link href="/agreement/partner" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Partner Agreement
              </Link>
              , which is the binding document you sign digitally with your name, email, and
              signature. Signing the Partner Agreement confirms that you have read and agree to
              the terms below.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              2. Eligibility
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              The Programme is open to creators, pages, and individuals who have a SoundBridge
              account and wish to introduce people to independent musicians, podcasters, and DJs
              on the platform. You must register a SoundBridge account using the same email you
              sign this agreement with, as your Partner benefits and referral link are attached to
              that account.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              3. Your Benefits
            </h2>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <li>One year of SoundBridge Premium, free, starting from your sign-up date.</li>
              <li>
                10% commission on every paid subscription from someone who joins through your
                unique referral link, for as long as they remain subscribed.
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              These benefits are guaranteed under the Partner Agreement once your application is
              approved and your account is set up.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              4. Referral Link &amp; Commission
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <p>
                <strong>Attribution:</strong> Commission is earned on subscriptions started by
                people who sign up using your unique referral link. We attribute a subscription to
                you based on that link at the time of sign-up.
              </p>
              <p>
                <strong>Payment:</strong> Commission accrues on your Partner Dashboard, where you
                can track referrals and earnings at any time. Payout cadence and method will be
                confirmed with you as part of onboarding.
              </p>
              <p>
                <strong>Duration:</strong> Commission continues for as long as the referred user
                remains an active, paying subscriber. If they cancel or lapse, commission on that
                referral stops; it resumes only if they resubscribe through the same attribution.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              5. Partnership Term
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This is an ongoing, open-ended partnership with no fixed end date — we intend for it
              to be long-term, and for SoundBridge to keep supporting your content and growth as
              the platform grows. It continues until either party ends it as described in Section
              8 (Termination). The one-year Premium benefit and the 10% commission structure
              described in Section 3 remain fixed as described for as long as the Programme and
              your participation in it continue, regardless of how long the partnership runs.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              6. Partner Responsibilities &amp; Conduct
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>As a Partner, you agree to:</p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <li>Represent SoundBridge honestly and accurately when sharing your referral link</li>
              <li>Not make false, misleading, or unauthorised claims about SoundBridge, its features, or its benefits</li>
              <li>Not use spam, paid bot traffic, or deceptive tactics to generate referrals</li>
              <li>Not create duplicate or fraudulent accounts to generate commission</li>
              <li>Continue to follow SoundBridge's{' '}
                <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  Terms of Service
                </Link>{' '}
                as a user of the platform
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Referrals found to be generated through fraudulent or abusive means will not be
              credited, and may result in commission being withheld or the Programme being
              terminated for that Partner.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              7. Independent Status
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You participate in the Programme as an independent partner, not as an employee,
              agent, or legal representative of SoundBridge Live Ltd. Nothing in this agreement
              creates a partnership, joint venture, or employment relationship in the legal sense.
              You are responsible for any tax obligations arising from commission you earn.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              8. Termination
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You may end your participation in the Programme at any time by notifying us at
              contact@soundbridge.live. SoundBridge may end a Partner's participation for breach of
              Section 6 (Partner Responsibilities &amp; Conduct), fraudulent activity, or if the
              Programme itself is discontinued platform-wide. Commission already earned on active
              referrals up to the date of termination remains payable; your Premium benefit for the
              remainder of its current one-year period is unaffected unless termination is for
              fraud or breach.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              9. Relationship to Our Other Policies
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This Programme operates alongside, and does not replace, SoundBridge's platform-wide
              policies. As a SoundBridge user and Partner, you remain subject to our:
            </p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <li>
                <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/copyright" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  Copyright Policy
                </Link>{' '}
                and{' '}
                <Link href="/legal/dmca" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  DMCA Notice and Takedown
                </Link>
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Where anything in this document conflicts with the Terms of Service, the Terms of
              Service govern your general use of the platform; this document governs the Partner
              Programme specifically.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              10. Changes to This Programme
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              We may update these Programme terms from time to time, for example to adjust
              operational details as we grow. We will not reduce your existing Premium benefit or
              the 10% commission rate on referrals you have already generated. We will notify
              active Partners of any material changes.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              11. Governing Law
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This agreement is governed by the laws of England and Wales, consistent with our{' '}
              <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Terms of Service
              </Link>
              , subject to mandatory consumer protections that may apply in your jurisdiction.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--accent-primary)',
                paddingBottom: '0.5rem',
              }}
            >
              12. Contact
            </h2>
            <div
              style={{
                background: 'var(--card-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <p style={{ color: 'var(--text-secondary)' }}>
                Questions about the Partner Programme? Email us at:
                <br />
                <strong>contact@soundbridge.live</strong>
              </p>
            </div>
          </section>
        </div>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/agreement/partner"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              border: '2px solid var(--accent-primary)',
              borderRadius: '25px',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: '500',
              background: 'var(--accent-primary)',
            }}
          >
            Ready to sign? Go to the Partner Agreement
          </Link>
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
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
