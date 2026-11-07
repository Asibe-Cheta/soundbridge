/**
 * Plain string constants/functions only — safe to import from client
 * components. Server-only logic (hashing, rate limiting, admin check) lives
 * in role-agreement.ts.
 *
 * Reusable for other volunteer-role agreements: add an entry to
 * ROLE_AGREEMENTS with a new slug, role title and signer name, then seed a
 * matching row in role_agreement_signups. The page at
 * /agreement/[role] looks up the config by the slug in the URL.
 */

export type RoleAgreementConfig = {
  slug: string;
  roleTitle: string;
  signerName: string;
};

export const ROLE_AGREEMENTS: Record<string, RoleAgreementConfig> = {
  'product-manager': {
    slug: 'product-manager',
    roleTitle: 'Product Manager',
    signerName: 'Promise Akabudu',
  },
};

export function getRoleAgreementConfig(slug: string): RoleAgreementConfig | null {
  return ROLE_AGREEMENTS[slug] ?? null;
}

const ROLE_TITLE_TOKEN = '{{ROLE_TITLE}}';
const SIGNER_NAME_TOKEN = '{{SIGNER_NAME}}';

export const AGREEMENT_TEXT = `Volunteer Agreement: ${ROLE_TITLE_TOKEN}

Between SoundBridge Live Ltd (UK company number 16854928), represented by Justice Asibe, Founder and CEO, and ${SIGNER_NAME_TOKEN} (the volunteer).

1. Your role. You will volunteer as a ${ROLE_TITLE_TOKEN} at SoundBridge, working alongside another volunteer Product Manager. Justice Asibe will confirm who leads which area once the roadmap is agreed.

2. What the role involves. Researching how creators, fans and industry professionals use SoundBridge and comparable platforms. Turning the SoundBridge vision into a roadmap with timelines and clear milestones. Writing specifications for features (the user flow, what triggers it, the wording, and what "done" looks like). Reviewing the app and proposing concrete improvements with reasons. Helping prioritise the ideas backlog by effort and impact. Suggesting the metrics we should track and reporting on them. Your first task is to use the app as a new listener and then as a creator, and send a one to two page write-up with 3 to 5 changes you would make and why.

3. Time and how we work. Hours are flexible and you contribute as time allows. Deliverables are agreed with dates. Communication is mainly on WhatsApp. If stuck or unable to meet a date, tell Justice early.

4. No pay, no employment, no equity. This is a volunteer role. You are not paid and are not an employee. No equity, shares, options or other payment is promised or implied. Any pay or equity would need a separate written agreement signed by both sides. SoundBridge will give credit for contributions, genuine product experience and mentorship.

5. Confidentiality. Everything non-public about SoundBridge (roadmap, plans, user data, partners, investors, finances, documents) is confidential, during and after this arrangement.

6. Ownership of your work. Anything created for SoundBridge in this role belongs to SoundBridge Live Ltd, which may use, change and build on it freely. You keep your own general skills and experience.

7. Your other commitments. By signing, you confirm that your employer or any organisation you serve allows outside volunteer work, that you will not use your employer's time, tools or confidential information, and that you will tell Justice if anything changes.

8. Data and systems access. No access to user data, accounts or systems unless SoundBridge grants it separately in writing.

9. Review and ending. A review after three months. Either side may end the arrangement at any time with a short written message (WhatsApp or email is fine). Sections 5, 6 and 8 continue after it ends.

10. Law. This Agreement is governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction, subject to any mandatory rights you have as a consumer in your country of residence.

By entering your details and signing below, you agree to these terms, and confirm your employer allows outside volunteer work.`;

/** Substitutes the role title and signer name into the agreement text for display, hashing, and the PDF. */
export function renderAgreementText(roleTitle: string, signerName: string): string {
  const role = roleTitle.trim() || 'volunteer';
  const name = signerName.trim() || 'the volunteer';
  return AGREEMENT_TEXT.split(ROLE_TITLE_TOKEN).join(role).split(SIGNER_NAME_TOKEN).join(name);
}
