export const CREATOR_AGREEMENT_VERSION = 'v1.0';

export const CREATOR_AGREEMENT_CHECKBOXES = [
  {
    id: 'content_rights',
    label:
      'I confirm that I own or have the rights to all content I will upload to SoundBridge. I understand that uploading content I do not have rights to may result in removal of that content and termination of my account.',
  },
  {
    id: 'platform_marketplace',
    label:
      'I understand that SoundBridge is a platform and marketplace. SoundBridge does not endorse, guarantee or take responsibility for my content, services or events.',
  },
  {
    id: 'event_responsibility',
    label:
      'I confirm that any events I list on SoundBridge are my sole responsibility including their organisation, safety and delivery. SoundBridge is not liable for anything that occurs at my events.',
  },
  {
    id: 'independent_contractor',
    label:
      'I confirm that any services I offer through the SoundBridge marketplace are provided by me as an independent contractor. I am not an employee or agent of SoundBridge.',
  },
  {
    id: 'terms_privacy',
    label:
      'I have read and agree to the SoundBridge Terms of Service, Privacy Policy and Creator Rights Agreement.',
    hasLinks: true,
  },
] as const;

export type CreatorAgreementCheckboxId = (typeof CREATOR_AGREEMENT_CHECKBOXES)[number]['id'];

export function emptyCreatorAgreementChecks(): Record<CreatorAgreementCheckboxId, boolean> {
  return {
    content_rights: false,
    platform_marketplace: false,
    event_responsibility: false,
    independent_contractor: false,
    terms_privacy: false,
  };
}

export function allCreatorAgreementChecksTicked(
  checks: Record<CreatorAgreementCheckboxId, boolean>,
): boolean {
  return CREATOR_AGREEMENT_CHECKBOXES.every((item) => checks[item.id]);
}
