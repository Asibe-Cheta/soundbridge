'use client';

import {
  LegalDocumentShell,
  LegalParagraph,
  LegalSection,
} from '@/src/components/legal/LegalDocumentShell';

export default function DmcaPolicyPage() {
  return (
    <LegalDocumentShell title="DMCA Notice and Takedown" lastUpdated="June 3, 2026">
      <LegalSection title="Designated agent">
        <LegalParagraph>
          SoundBridge Live Ltd&apos;s DMCA Designated Agent is registered with the U.S. Copyright Office
          (Registration No. DMCA-1070287).
        </LegalParagraph>
        <LegalParagraph>
          <strong>Email:</strong>{' '}
          <a href="mailto:dmca@soundbridge.live" style={{ color: 'var(--accent-primary)' }}>
            dmca@soundbridge.live
          </a>
          <br />
          <strong>Legal contact:</strong>{' '}
          <a href="mailto:contact@soundbridge.live" style={{ color: 'var(--accent-primary)' }}>
            contact@soundbridge.live
          </a>
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Submitting a takedown notice">
        <LegalParagraph>
          If you believe your copyright has been infringed on SoundBridge, send a written notice to
          dmca@soundbridge.live including:
        </LegalParagraph>
        <ul
          style={{
            listStyle: 'disc',
            paddingLeft: '1.5rem',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
          }}
        >
          <li>Your contact information (name, address, phone, email)</li>
          <li>Identification of the copyrighted work claimed to have been infringed</li>
          <li>Identification of the infringing material and its location on SoundBridge (URL or track ID)</li>
          <li>A statement that you have a good-faith belief that use of the material is not authorised</li>
          <li>
            A statement, under penalty of perjury, that the information in the notice is accurate and that you
            are authorised to act on behalf of the rights holder
          </li>
          <li>Your physical or electronic signature</li>
        </ul>
      </LegalSection>

      <LegalSection title="Our response">
        <LegalParagraph>
          We review valid notices promptly (typically within 24–72 hours), remove or disable access to
          infringing material where appropriate, notify the uploader, and maintain records of takedown actions
          as required by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Counter-notice">
        <LegalParagraph>
          If your content was removed and you believe the removal was a mistake, you may file a counter-notice
          to dmca@soundbridge.live including your contact information, identification of the removed material,
          a statement under penalty of perjury that you believe the removal was erroneous, consent to
          jurisdiction, and your signature. We may restore content within 10–14 business days unless the
          complainant initiates legal proceedings.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Repeat infringers">
        <LegalParagraph>
          SoundBridge maintains a policy of terminating accounts of repeat infringers in appropriate
          circumstances. See our{' '}
          <a href="/legal/copyright" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Copyright Policy
          </a>{' '}
          for our three-strike approach.
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}
