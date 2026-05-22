'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const sectionHeading: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '1rem',
  borderBottom: '2px solid var(--accent-primary)',
  paddingBottom: '0.5rem',
};

const bodyText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  marginBottom: '1rem',
};

const listStyle: React.CSSProperties = {
  listStyle: 'disc',
  paddingLeft: '1.5rem',
  color: 'var(--text-secondary)',
  marginBottom: '1rem',
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={sectionHeading}>{title}</h2>
      {children}
    </section>
  );
}

export default function AmlPolicyPage() {
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
            marginBottom: '2rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontWeight: 'bold',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem',
            }}
          >
            Anti-Money Laundering Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            SoundBridge Live Ltd
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>Last updated: May 2026</p>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          <Section title="1. Introduction">
            <p style={bodyText}>
              SoundBridge Live Ltd (Company No. 16854928, registered in England and Wales) is
              committed to preventing money laundering and financial crime on its platform. This
              policy outlines the measures SoundBridge takes to detect, prevent, and report
              suspicious activity in accordance with applicable UK regulations including the
              Proceeds of Crime Act 2002 and the Money Laundering, Terrorist Financing and Transfer
              of Funds Regulations 2017.
            </p>
          </Section>

          <Section title="2. Scope">
            <p style={bodyText}>
              This policy applies to all financial transactions processed through the SoundBridge
              platform, including fan tipping, event ticket sales, music sales, service bookings,
              and creator withdrawal payouts.
            </p>
          </Section>

          <Section title="3. Customer Due Diligence">
            <p style={bodyText}>
              SoundBridge applies the following due diligence measures to creators and users on the
              platform:
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>3.1 Identity Verification</strong>
            </p>
            <p style={bodyText}>
              All creators who wish to withdraw earnings from the platform are required to complete
              identity verification via our third-party KYC provider (Persona). This includes
              submission of a government-issued photo ID and a live selfie verification check.
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>3.2 Bank Account Verification</strong>
            </p>
            <p style={bodyText}>
              Creator bank account details are verified via API before any payout is initiated.
              Payouts are made exclusively to the verified bank account on file for the verified
              creator account. No third-party disbursements are permitted.
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>3.3 Platform Terms</strong>
            </p>
            <p style={bodyText}>
              All users must accept SoundBridge&apos;s{' '}
              <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Terms of Service
              </Link>
              ,{' '}
              <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Privacy Policy
              </Link>
              , and content policies at registration. By accepting these terms, users confirm they
              will not use the platform for unlawful purposes.
            </p>
          </Section>

          <Section title="4. Prohibited Activities">
            <p style={bodyText}>The following activities are strictly prohibited on SoundBridge:</p>
            <ul style={listStyle}>
              <li>Using the platform to launder money or conceal the proceeds of crime</li>
              <li>Structuring transactions to avoid reporting thresholds</li>
              <li>Providing false identity information during verification</li>
              <li>Using the platform to fund terrorist activities or organisations</li>
              <li>Processing payments on behalf of sanctioned individuals or entities</li>
              <li>Any activity that violates applicable UK or international financial crime laws</li>
            </ul>
            <p style={bodyText}>
              Accounts found to be engaged in prohibited activities will be immediately suspended
              and reported to the relevant authorities.
            </p>
          </Section>

          <Section title="5. Transaction Monitoring">
            <p style={bodyText}>
              SoundBridge monitors platform transactions for unusual or suspicious activity
              including but not limited to:
            </p>
            <ul style={listStyle}>
              <li>
                Unusually large or frequent tip transactions inconsistent with a creator&apos;s
                activity history
              </li>
              <li>Multiple withdrawal requests in a short period from a newly verified account</li>
              <li>Mismatches between declared identity and payment details</li>
              <li>Activity patterns inconsistent with legitimate creative industry use</li>
            </ul>
            <p style={bodyText}>
              All first-time withdrawals above a defined threshold are subject to manual review
              before processing.
            </p>
          </Section>

          <Section title="6. Reporting Suspicious Activity">
            <p style={bodyText}>
              Where SoundBridge identifies or suspects money laundering or financial crime, the
              following steps are taken:
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>6.1</strong> Internal escalation to
              the platform administrator for immediate review and transaction hold where
              appropriate.
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>6.2</strong> Where required by law, a
              Suspicious Activity Report (SAR) is submitted to the National Crime Agency (NCA) via
              the UKFIU reporting system.
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>6.3</strong> Records of the
              suspicious activity, including all relevant transaction data and identity information,
              are retained in accordance with UK data retention requirements.
            </p>
            <p style={bodyText}>
              SoundBridge does not tip off any individual or entity that a SAR has been filed.
            </p>
          </Section>

          <Section title="7. Record Keeping">
            <p style={bodyText}>
              SoundBridge retains the following records for a minimum of five years from the date of
              the transaction or the end of the business relationship:
            </p>
            <ul style={listStyle}>
              <li>Identity verification records for all verified creators</li>
              <li>Bank account verification records</li>
              <li>All payout transaction records linked to verified identity</li>
              <li>Any suspicious activity reports or internal escalation records</li>
            </ul>
          </Section>

          <Section title="8. Payment Processing Partners">
            <p style={bodyText}>
              SoundBridge processes payments through the following regulated third-party partners:
            </p>
            <p style={{ ...bodyText, marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Stripe Payments Europe Ltd</strong> —
              FCA authorised payment institution, responsible for card payment processing, fraud
              detection, and consumer-facing payment compliance.
            </p>
            <p style={bodyText}>
              <strong style={{ color: 'var(--text-primary)' }}>Fincra</strong> — licensed payment
              service provider responsible for cross-border payouts to African beneficiaries
              (Nigeria, Ghana, Kenya and other supported corridors).
            </p>
            <p style={bodyText}>
              Both partners apply their own AML and compliance controls in addition to
              SoundBridge&apos;s internal measures.
            </p>
          </Section>

          <Section title="9. Compliance Oversight">
            <p style={bodyText}>
              The Founder and CEO of SoundBridge Live Ltd, Justice Chetachukwu Asibe, currently
              holds oversight responsibility for AML compliance. As the business scales, SoundBridge
              is committed to appointing a qualified Money Laundering Reporting Officer (MLRO) and
              engaging third-party compliance review ahead of material growth in transaction
              volumes.
            </p>
          </Section>

          <Section title="10. Policy Review">
            <p style={bodyText}>
              This policy is reviewed and updated regularly to reflect changes in applicable
              regulations, business operations, and best practice. The date of the most recent
              review is shown at the top of this page.
            </p>
          </Section>

          <Section title="11. Contact">
            <p style={bodyText}>For questions relating to this policy please contact:</p>
            <p style={{ ...bodyText, marginBottom: '0.25rem' }}>Justice Chetachukwu Asibe</p>
            <p style={{ ...bodyText, marginBottom: '0.25rem' }}>
              Founder and CEO, SoundBridge Live Ltd
            </p>
            <p style={bodyText}>
              <a
                href="mailto:justice@soundbridge.live"
                style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
              >
                justice@soundbridge.live
              </a>
            </p>
            <p style={bodyText}>
              <a
                href="https://soundbridge.live"
                style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
              >
                soundbridge.live
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
