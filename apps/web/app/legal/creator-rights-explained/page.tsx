'use client';

import Link from 'next/link';
import {
  LegalDocumentShell,
  LegalParagraph,
  LegalSection,
} from '@/src/components/legal/LegalDocumentShell';
import { CREATOR_SHARE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';

const creatorSharePercent = Math.round(CREATOR_SHARE_DECIMAL * 100);

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
  marginBottom: '1rem',
  fontSize: '0.95rem',
};

const cellStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  padding: '0.75rem 1rem',
  verticalAlign: 'top',
  color: 'var(--text-secondary)',
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  color: 'var(--text-primary)',
  background: 'var(--hover-bg)',
};

export default function CreatorRightsExplainedPage() {
  return (
    <LegalDocumentShell title="Creator Rights Explained" lastUpdated="June 22, 2026">
      <LegalParagraph>
        This page is a plain-language summary for creators, partners, and legal advisers reviewing how
        SoundBridge handles content ownership, hosting, distribution, and payments. It is intended to
        answer common questions clearly and directly.
      </LegalParagraph>

      <LegalSection title="1. Using SoundBridge without hosting your music">
        <LegalParagraph>
          You can use SoundBridge fully for professional networking, event promotion, the Request
          Room, fan tipping, and the service marketplace without ever uploading audio content.
          Hosting music or podcasts on SoundBridge is optional — not a requirement for any other
          feature on the platform.
        </LegalParagraph>
        <LegalParagraph>
          If you already have an existing distribution partner handling your releases and streaming
          royalties, that relationship is unaffected by joining SoundBridge for event promotion, fan
          engagement, and professional networking alone. SoundBridge operates as a technology platform
          and marketplace connecting creators with fans and collaborators; it is not a record label
          or your distributor unless you separately choose optional distribution facilitation described
          below.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. If you choose to host content on SoundBridge">
        <LegalParagraph>
          <strong>You retain ownership.</strong> As stated in our{' '}
          <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Terms of Service
          </Link>
          , you retain ownership of content you upload. SoundBridge does not acquire ownership of your
          music, lyrics, recordings, artwork, or other uploaded material.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Limited licence to SoundBridge.</strong> By uploading, you grant SoundBridge a
          non-exclusive licence to host and distribute your content on the platform — solely so it can
          be made available to listeners and to support platform features such as playback and tipping.
          &ldquo;Non-exclusive&rdquo; means you remain free to have the same content simultaneously
          available through any other distributor, label, or platform. Hosting on SoundBridge does not
          prevent or restrict a separate distribution arrangement you already have.
        </LegalParagraph>
        <LegalParagraph>
          <strong>Removal and account closure.</strong> You may remove your content or close your
          account at any time, subject to the Terms of Service. On closure, SoundBridge will cease new
          public use of your content in line with the Terms and product functionality then in effect,
          except where retention is required by law, backup policy, or an outstanding dispute.
        </LegalParagraph>
        <LegalParagraph>
          Creators who sign our separate Creator Rights Agreement receive additional detail on ownership
          and licensing; where that agreement addresses ownership of uploaded content, it prevails on
          that specific question as between you and SoundBridge Live Ltd.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Distribution to streaming platforms (optional)">
        <LegalParagraph>
          SoundBridge separately offers an <strong>optional</strong> facilitation service that connects
          creators with MBG Sonics for distribution to Spotify, Apple Music, and other major streaming
          platforms, for a flat one-time fee per release. This is entirely separate from hosting
          content on SoundBridge, entirely optional, and independent of any existing distribution
          relationship you already have. You may decline this service and keep your current distributor
          while using every other part of SoundBridge.
        </LegalParagraph>
        <LegalParagraph>
          SoundBridge does not collect, hold, or pay streaming royalties on your behalf. Royalty
          arrangements for content distributed to streaming platforms are handled directly between you
          and MBG Sonics or your existing distributor — not through SoundBridge. SoundBridge&apos;s role
          in that flow is facilitation and referral only.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Direct fan tips — how money moves">
        <LegalParagraph>
          Tips paid by fans are processed through Stripe. SoundBridge facilitates the payment as a
          payment intermediary only (see Terms of Service, Section 15). The creator receives{' '}
          {creatorSharePercent}% of each tip; SoundBridge retains a {PLATFORM_FEE_PERCENT}% platform fee
          on that transaction.
        </LegalParagraph>
        <LegalParagraph>
          SoundBridge does not take any ownership stake, royalty interest, or ongoing percentage of your
          underlying music rights — only the stated platform fee on in-app tips and other transactions
          processed through the platform, as described in the Terms of Service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Content standards">
        <LegalParagraph>
          SoundBridge does not remove lyrical content solely because it contains religious references —
          including references to Jesus or other religious figures or terms — provided the content
          otherwise complies with our standard content guidelines (for example: no hate speech,
          harassment, illegal material, or copyright infringement).
        </LegalParagraph>
        <LegalParagraph>
          Discovery and feed matching are based on factors such as genre, mood, and location preference —
          not on suppressing religious expression. SoundBridge does not pre-screen all uploads for
          copyright compliance before publication; creators remain responsible for the rights to content
          they upload, as set out in the Terms of Service and Copyright Policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Partner referral programme">
        <LegalParagraph>
          SoundBridge operates an optional partner referral programme for approved partners. When a new
          user completes signup through a partner&apos;s unique referral link and later subscribes to a
          paid SoundBridge plan, the referring partner may earn a commission (currently 10% of the
          subscription value attributable to that conversion, unless a different rate is agreed in
          writing for that partner).
        </LegalParagraph>
        <LegalParagraph>
          Commission is calculated when the referred user converts to a paid subscription, tracked in our
          partner systems, and paid to eligible partners according to the programme&apos;s payment
          schedule. Participation in the referral programme creates no ownership, equity, employment, or
          agency relationship between SoundBridge and the referring partner.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Summary">
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>What SoundBridge has rights to</th>
                <th style={headerCellStyle}>What remains entirely yours</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cellStyle}>
                  A non-exclusive licence to host, stream, and display content you choose to upload, so
                  the platform can operate
                </td>
                <td style={cellStyle}>
                  Full copyright ownership of your music, lyrics, recordings, and other creative works
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  A {PLATFORM_FEE_PERCENT}% platform fee on tips and other in-app transactions we
                  facilitate (you receive {creatorSharePercent}% of tips)
                </td>
                <td style={cellStyle}>
                  Your underlying music rights, masters, and publishing — no royalty share in your
                  catalogue
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  Optional referral commission when a referred user you introduced subscribes to a paid
                  plan (partner programme only)
                </td>
                <td style={cellStyle}>
                  Your existing distribution deal with any other label or distributor, unless you
                  separately opt into MBG Sonics facilitation
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  Facilitation of optional MBG Sonics distribution (if you choose it) — not ownership of
                  releases
                </td>
                <td style={cellStyle}>
                  Streaming royalties from Spotify, Apple Music, and other DSPs — paid by your distributor
                  (MBG Sonics or your existing partner), not by SoundBridge
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  Enforcement of platform content guidelines (legality, harm, copyright, hate speech)
                </td>
                <td style={cellStyle}>
                  Freedom to use religious expression in lyrics where content otherwise complies with
                  platform guidelines
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  Use of networking, events, Request Room, marketplace, and tipping without requiring
                  you to upload audio
                </td>
                <td style={cellStyle}>
                  Choice whether to host audio on SoundBridge at all
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Governing documents">
        <LegalParagraph>
          <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Terms of Service
          </Link>
          {' · '}
          <Link href="/legal/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          {' · '}
          <Link href="/legal/copyright" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Copyright Policy
          </Link>
        </LegalParagraph>
        <LegalParagraph>
          <em>
            This page is a plain-language summary for clarity. The full{' '}
            <Link href="/legal/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
              Terms of Service
            </Link>{' '}
            is the governing legal document. Questions:{' '}
            <a href="mailto:contact@soundbridge.live" style={{ color: 'var(--accent-primary)' }}>
              contact@soundbridge.live
            </a>
          </em>
        </LegalParagraph>
      </LegalSection>
    </LegalDocumentShell>
  );
}
