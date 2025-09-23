'use client';

import React from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { RoleSelectionModal } from './RoleSelectionModal';
import { ProfileCompletionWizard } from './ProfileCompletionWizard';
import { FirstActionGuidance } from './FirstActionGuidance';

export function OnboardingManager() {
  const { onboardingState, setCurrentStep } = useOnboarding();
  const { showOnboarding, currentStep } = onboardingState;

  if (!showOnboarding) return null;

  const handleClose = () => {
    // Don't allow closing during onboarding - user must complete or skip
    return;
  };

  const handleRoleSelectionComplete = () => {
    setCurrentStep('profile_setup');
  };

  const handleProfileCompletionComplete = () => {
    setCurrentStep('first_action');
  };

  const handleFirstActionComplete = () => {
    // Onboarding will be completed by the FirstActionGuidance component
  };

  return (
    <>
      {currentStep === 'role_selection' && (
        <RoleSelectionModal
          isOpen={showOnboarding}
          onClose={handleClose}
        />
      )}
      
      {currentStep === 'profile_setup' && (
        <ProfileCompletionWizard
          isOpen={showOnboarding}
          onClose={handleClose}
        />
      )}
      
      {currentStep === 'first_action' && (
        <FirstActionGuidance
          isOpen={showOnboarding}
          onClose={handleClose}
        />
      )}
    </>
  );
}
