'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { WelcomeScreen } from './WelcomeScreen';
import { UserTypeSelection } from './UserTypeSelection';
import { QuickSetup } from './QuickSetup';
import { ValueDemo } from './ValueDemo';
import { TierSelection } from './TierSelection';
import { PaymentCollection } from './PaymentCollection';
import { WelcomeConfirmation } from './WelcomeConfirmation';

// Legacy components (kept for backward compatibility)
import { RoleSelectionModal } from './RoleSelectionModal';
import { ProfileCompletionWizard } from './ProfileCompletionWizard';
import { FirstActionGuidance } from './FirstActionGuidance';

export function OnboardingManager() {
  const { onboardingState, setCurrentStep, completeOnboarding } = useOnboarding();
  const { showOnboarding, currentStep } = onboardingState;
  const [welcomeShown, setWelcomeShown] = useState(false);

  if (!showOnboarding) return null;

  // NEW FLOW: 7-screen onboarding
  const isNewFlow = ['welcome', 'userType', 'quickSetup', 'valueDemo', 'tierSelection', 'payment', 'welcomeConfirmation'].includes(currentStep);

  if (isNewFlow) {
    return (
      <>
        {currentStep === 'welcome' && (
          <WelcomeScreen
            isOpen={showOnboarding && !welcomeShown}
            onContinue={() => {
              setWelcomeShown(true);
              setCurrentStep('userType');
            }}
          />
        )}
        
        {currentStep === 'userType' && (
          <UserTypeSelection
            isOpen={showOnboarding}
            onContinue={() => {
              // Continue handled by component
            }}
            onBack={() => setCurrentStep('welcome')}
          />
        )}
        
        {currentStep === 'quickSetup' && (
          <QuickSetup
            isOpen={showOnboarding}
            onContinue={() => {
              // Continue handled by component
            }}
            onBack={() => setCurrentStep('userType')}
          />
        )}
        
        {currentStep === 'valueDemo' && (
          <ValueDemo
            isOpen={showOnboarding}
            onContinue={() => {
              // Continue handled by component
            }}
            onBack={() => setCurrentStep('quickSetup')}
          />
        )}
        
        {currentStep === 'tierSelection' && (
          <TierSelection
            isOpen={showOnboarding}
            onContinue={(tier) => {
              if (tier === 'pro') {
                // Payment screen will be shown by component
              } else {
                // Welcome confirmation will be shown by component
              }
            }}
            onBack={() => setCurrentStep('valueDemo')}
          />
        )}
        
        {currentStep === 'payment' && (
          <PaymentCollection
            isOpen={showOnboarding}
            onSuccess={() => {
              // Welcome confirmation will be shown
            }}
            onBack={() => setCurrentStep('tierSelection')}
          />
        )}
        
        {currentStep === 'welcomeConfirmation' && (
          <WelcomeConfirmation
            isOpen={showOnboarding}
            onComplete={async () => {
              if (completeOnboarding) {
                await completeOnboarding();
              }
            }}
          />
        )}
      </>
    );
  }

  // OLD FLOW: Legacy components (for backward compatibility)
  const handleClose = async () => {
    if (completeOnboarding) {
      await completeOnboarding();
    }
  };

  const handleRoleSelectionComplete = () => {
    setCurrentStep('profile_setup');
  };

  const handleProfileCompletionComplete = async () => {
    if (completeOnboarding) {
      await completeOnboarding();
    }
  };

  const handleFirstActionComplete = async () => {
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
