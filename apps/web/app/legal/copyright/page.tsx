'use client';

import Link from 'next/link';
import {
  LegalDocumentShell,
  LegalParagraph,
  LegalSection,
} from '@/src/components/legal/LegalDocumentShell';

export default function CopyrightPolicyPage() {
  return (
    <LegalDocumentShell title="Copyright Policy" lastUpdated="June 3, 2026">
      <LegalSection title="Your responsibility as a creator">
        <LegalParagraph>
          By uploading content to SoundBridge, you confirm that you own all rights to the music or have
          obtained proper licences, that the content does not infringe any third-party copyrights, and that you
          have authority to grant SoundBridge a licence to host and distribute your work.
        </LegalParagraph>
        <LegalParagraph>
          Creators are solely responsible for ensuring they have the right to upload all content they submit to
          the platform. SoundBridge does not pre-screen content for copyright compliance and is not liable for
          infringing content uploaded by creators before receiving a valid takedown notice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="DJ mixes and remixes">
        <LegalParagraph>
          SoundBridge allows DJ mixes for promotional, non-commercial use where permitted. Mixes may contain
          third-party recordings that uploaders do not own. Rights holders may submit valid DMCA notices for
          removal. Repeated infringement can result in content removal or account suspension.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Safe harbour">
        <LegalParagraph>
          SoundBridge complies with the Digital Millennium Copyright Act (DMCA) and the Copyright, Designs and
          Patents Act 1988. SoundBridge is registered as a DMCA Designated Agent (Registration No.
          DMCA-1070287). We respond promptly to valid takedown notices and operate under the safe harbour
          provisions available to platform operators under applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Three-strike policy">
        <LegalParagraph>
          <strong>Strike 1:</strong> Warning and content removed.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Strike 2:</strong> Temporary suspension and content removed.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Strike 3:</strong> Permanent account termination.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Reporting infringement">
        <LegalParagraph>
          To submit a copyright takedown notice, see our{' '}
          <Link href="/legal/dmca" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            DMCA Notice and Takedown
          </Link>{' '}
          page or email{' '}
          <a href="mailto:dmca@soundbridge.live" style={{ color: 'var(--accent-primary)' }}>
            dmca@soundbridge.live
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Related policies">
        <LegalParagraph>
          <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Terms of Service
          </Link>
          {' · '}
          <Link href="/legal/dmca" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            DMCA Notice and Takedown
          </Link>
          {' · '}
          <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}
