/**
 * Plain string constants/functions only — safe to import from client
 * components. Server-only logic (hashing, rate limiting) lives in
 * podcast-host-agreement.ts.
 */
export const AGREEMENT_VERSION = 'v1';

const HOST_NAME_TOKEN = '{{HOST_NAME}}';

/**
 * The host's name is the one part of this agreement that varies per
 * signer. It's substituted in from the podcast_host_agreement_signups.label
 * column (set when the link is created) rather than stored as a separate
 * field, so no schema change was needed for this.
 */
export const AGREEMENT_TEXT = `This agreement is between SoundBridge Live Ltd (UK company number 16854928, "SoundBridge") and ${HOST_NAME_TOKEN} ("the Host").

1. The role. The Host will host and interview guests on the SoundBridge podcast, including preparing questions, leading the conversation and working with SoundBridge on guests and topics.

2. Nature of the sessions. Sessions are conversational interviews, recorded in front of a small invited audience, at a location chosen by SoundBridge, and usually last 60 to 90 minutes. The first session is an interview with SoundBridge's founder. Later sessions feature artists and industry guests. Topics include experiences in the music, creator and event promotion industries (including stories submitted anonymously by musicians), the problems creators face, and the solutions SoundBridge is building. Audience members may ask questions and share their views.

3. First four sessions. The Host will host four recorded sessions. SoundBridge will pay ₦50,000 for each session (₦200,000 in total).

4. Payment. Each ₦50,000 is paid by bank transfer on the same day the session is recorded.

5. Start date and scheduling. No start date is fixed yet. SoundBridge will give at least 7 days' notice of each session, and sessions will be scheduled by agreement between both sides.

6. Equipment and venue. SoundBridge provides the recording location, equipment and production setup.

7. Editorial approach. SoundBridge decides the topics and edits the final episodes. The Host will keep conversations respectful and will not make accusations about named people or companies. Anonymous stories will be reviewed by SoundBridge before they are used.

8. Ownership. SoundBridge owns the recordings and may edit, clip, publish and promote them on any platform. The Host agrees to appear in them and allows SoundBridge to use her name, voice and image for that purpose.

9. Future episodes and compensation. SoundBridge intends the podcast to continue well beyond the first four sessions, with the Host as its host. The Host's pay will increase as SoundBridge grows, and each increase will be agreed in writing.

10. University tours and other opportunities. SoundBridge plans to include the Host in its university tours and other events and activities. Her involvement and payment for each will be agreed separately in writing.

11. Independent role. The Host is an independent contractor and not an employee of SoundBridge.

12. Confidentiality. The Host will keep non-public SoundBridge information confidential, including business plans and information shared by guests in confidence.

13. Ending the agreement. Either side can end this agreement with 14 days' written notice. SoundBridge will pay for any session already recorded.

By typing your full name and signing below, you agree to these terms.`;

/** Substitutes the host's name into the agreement text for display, hashing, and the PDF. */
export function renderAgreementText(hostName: string): string {
  const name = hostName.trim() || 'the Host';
  return AGREEMENT_TEXT.split(HOST_NAME_TOKEN).join(name);
}
