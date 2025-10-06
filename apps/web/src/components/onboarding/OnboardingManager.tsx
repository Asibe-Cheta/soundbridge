'use client';

import React from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { RoleSelectionModal } from './RoleSelectionModal';
import { ProfileCompletionWizard } from './ProfileCompletionWizard';
import { FirstActionGuidance } from './FirstActionGuidance';

export function OnboardingManager() {
  const { onboardingState, setCurrentStep, completeOnboarding } = useOnboarding();
  const { showOnboarding, currentStep } = onboardingState;

  if (!showOnboarding) return null;

  const handleClose = async () => {
    // Allow closing - will complete onboarding when user clicks skip or complete
    if (completeOnboarding) {
      await completeOnboarding();
    }
  };

  const handleRoleSelectionComplete = () => {
    setCurrentStep('profile_setup');
  };

  const handleProfileCompletionComplete = async () => {
    // Complete onboarding when profile is done
    if (completeOnboarding) {
      await completeOnboarding();
    }
  };

  const handleFirstActionComplete = async () => {
    // Onboarding will be completed by the FirstActionGuidance component
    if (completeOnboarding) {
      await completeOnboarding();
    }
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
          onClose={handleProfileCompletionComplete}
        />
      )}
      
      {currentStep === 'first_action' && (
        <FirstActionGuidance
          isOpen={showOnboarding}
          onClose={handleFirstActionComplete}
        />
      )}
    </>
  );
}
