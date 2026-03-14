'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { WelcomeScreen } from './WelcomeScreen';
import { UserTypeSelection } from './UserTypeSelection';
import { QuickSetup } from './QuickSetup';
import { ValueDemo } from './ValueDemo';
import { TierSelection } from './TierSelection';
import { PaymentCollection } from './PaymentCollection';
import { WelcomeConfirmation } from './WelcomeConfirmation';
import { EventTypesStep } from './EventTypesStep';
import { EventOrganiserLocationStep } from './EventOrganiserLocationStep';
import { FirstPostStep } from './FirstPostStep';

// Legacy components (kept for backward compatibility)
import { RoleSelectionModal } from './RoleSelectionModal';
import { ProfileCompletionWizard } from './ProfileCompletionWizard';
import { FirstActionGuidance } from './FirstActionGuidance';

export function OnboardingManager() {
  const { onboardingState, setCurrentStep, completeOnboarding } = useOnboarding();
  const { user, session, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const { showOnboarding, currentStep } = onboardingState;
  const [welcomeShown, setWelcomeShown] = useState(false);

  // CRITICAL: Never show onboarding if user is not authenticated
  if (!user || !session) {
    return null;
  }

  // CRITICAL: Never show onboarding on login/signup/auth pages
  const isAuthPage = pathname?.startsWith('/login') || 
                     pathname?.startsWith('/signup') || 
                     pathname?.startsWith('/auth') ||
                     pathname?.startsWith('/(auth)') ||
                     pathname?.includes('/verify-email') ||
                     pathname?.includes('/reset-password');
  
  if (isAuthPage) {
    return null;
  }

  // Wait for auth to finish loading
  if (authLoading) {
    return null;
  }

  if (!showOnboarding) return null;

  // NEW FLOW: includes event organiser steps, first post, follow suggestions (WEB_TEAM_ONBOARDING_ENHANCEMENTS.MD)
  const isNewFlow = [
    'welcome', 'userType', 'quickSetup', 'valueDemo', 'tierSelection', 'payment', 'welcomeConfirmation',
    'eventTypes', 'eventOrganiser_location', 'eventOrganiser_valueDemo', 'followSuggestions', 'firstPost'
  ].includes(currentStep);

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
            onContinue={() => {}}
            onBack={() => setCurrentStep('userType')}
          />
        )}

        {currentStep === 'eventTypes' && (
          <EventTypesStep
            isOpen={showOnboarding}
            onContinue={() => {}}
            onBack={() => setCurrentStep('quickSetup')}
          />
        )}

        {currentStep === 'eventOrganiser_location' && (
          <EventOrganiserLocationStep
            isOpen={showOnboarding}
            onContinue={() => {}}
            onBack={() => setCurrentStep('eventTypes')}
          />
        )}

        {currentStep === 'valueDemo' && (
          <ValueDemo
            isOpen={showOnboarding}
            onContinue={() => {}}
            onBack={() => setCurrentStep('quickSetup')}
          />
        )}

        {currentStep === 'eventOrganiser_valueDemo' && (
          <ValueDemo
            isOpen={showOnboarding}
            onContinue={() => {}}
            onBack={() => setCurrentStep('eventOrganiser_location')}
          />
        )}

        {currentStep === 'tierSelection' && (
          <TierSelection
            isOpen={showOnboarding}
            onContinue={(tier) => {
              if (tier === 'premium' || tier === 'unlimited') {
                setCurrentStep('payment');
              } else {
                setCurrentStep('firstPost');
              }
            }}
            onBack={() => setCurrentStep(onboardingState.onboardingUserType === 'event_organiser' ? 'eventOrganiser_valueDemo' : 'valueDemo')}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentCollection
            key="payment-modal"
            isOpen={showOnboarding}
            selectedTier={onboardingState.selectedTier as 'premium' | 'unlimited'}
            onSuccess={() => setCurrentStep('firstPost')}
            onBack={() => setCurrentStep('tierSelection')}
          />
        )}

        {currentStep === 'firstPost' && (
          <FirstPostStep
            isOpen={showOnboarding}
            onComplete={async () => {
              if (completeOnboarding) await completeOnboarding();
            }}
            onBack={() => setCurrentStep('tierSelection')}
          />
        )}

        {currentStep === 'welcomeConfirmation' && (
          <WelcomeConfirmation
            isOpen={showOnboarding}
            onComplete={async () => {
              if (completeOnboarding) await completeOnboarding();
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
