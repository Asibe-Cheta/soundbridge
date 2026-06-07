export const CREATOR_ONBOARDING_USER_TYPES = [
  'music_creator',
  'podcast_creator',
  'industry_professional',
  'event_organiser',
] as const;

export type CreatorOnboardingUserType = (typeof CREATOR_ONBOARDING_USER_TYPES)[number];

export type OnboardingUserType =
  | CreatorOnboardingUserType
  | 'music_lover'
  | null
  | undefined;

/** Map onboarding_user_type (or legacy selected role) to profiles.role. */
export function roleFromOnboardingUserType(
  onboardingUserType: string | null | undefined,
): 'creator' | 'listener' | null {
  if (!onboardingUserType) return null;
  if (onboardingUserType === 'music_lover') return 'listener';
  if ((CREATOR_ONBOARDING_USER_TYPES as readonly string[]).includes(onboardingUserType)) {
    return 'creator';
  }
  return null;
}

/** Legacy onboarding selected_role values from older flows. */
export function roleFromLegacySelectedRole(
  selectedRole: string | null | undefined,
): 'creator' | 'listener' | null {
  if (!selectedRole) return null;
  if (selectedRole === 'listener' || selectedRole === 'music_lover') return 'listener';
  if (
    selectedRole === 'creator' ||
    ['musician', 'podcaster', 'event_promoter'].includes(selectedRole)
  ) {
    return 'creator';
  }
  return null;
}

export function resolveProfileRole(input: {
  onboardingUserType?: string | null;
  selectedRole?: string | null;
  explicitRole?: string | null;
}): 'creator' | 'listener' | null {
  const fromOnboardingType = roleFromOnboardingUserType(input.onboardingUserType);
  if (fromOnboardingType) return fromOnboardingType;

  if (input.explicitRole === 'creator' || input.explicitRole === 'listener') {
    return input.explicitRole;
  }
  if (input.explicitRole && input.explicitRole !== 'listener') {
    return 'creator';
  }

  return roleFromLegacySelectedRole(input.selectedRole);
}
