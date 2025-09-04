'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'musician' | 'podcaster' | 'event_promoter' | 'listener';
export type OnboardingStep = 'role_selection' | 'profile_setup' | 'first_action' | 'completed';

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedRole: UserRole | null;
  profileCompleted: boolean;
  firstActionCompleted: boolean;
  isOnboardingActive: boolean;
  showOnboarding: boolean;
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  setCurrentStep: (step: OnboardingStep) => void;
  setSelectedRole: (role: UserRole) => void;
  setProfileCompleted: (completed: boolean) => void;
  setFirstActionCompleted: (completed: boolean) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  startOnboarding: () => void;
  getNextStep: () => OnboardingStep | null;
  getProgressPercentage: () => number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    currentStep: 'role_selection',
    selectedRole: null,
    profileCompleted: false,
    firstActionCompleted: false,
    isOnboardingActive: false,
    showOnboarding: false,
  });

  // Check if user needs onboarding on mount
  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      // Reset onboarding state when user logs out
      setOnboardingState({
        currentStep: 'role_selection',
        selectedRole: null,
        profileCompleted: false,
        firstActionCompleted: false,
        isOnboardingActive: false,
        showOnboarding: false,
      });
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking onboarding status for user:', user?.id);
      const response = await fetch('/api/user/onboarding-status');
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Onboarding status response:', data);
        
        if (data.needsOnboarding) {
          console.log('🎯 User needs onboarding, showing modal');
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: true,
            showOnboarding: true,
            currentStep: data.currentStep || 'role_selection',
            selectedRole: data.selectedRole || null,
            profileCompleted: data.profileCompleted || false,
            firstActionCompleted: data.firstActionCompleted || false,
          }));
        } else {
          console.log('✅ User onboarding already completed');
        }
      } else {
        console.error('❌ Failed to check onboarding status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
    }
  };

  const setCurrentStep = (step: OnboardingStep) => {
    setOnboardingState(prev => ({ ...prev, currentStep: step }));
    updateOnboardingProgress({ currentStep: step });
  };

  const setSelectedRole = (role: UserRole) => {
    setOnboardingState(prev => ({ ...prev, selectedRole: role }));
    updateOnboardingProgress({ selectedRole: role });
  };

  const setProfileCompleted = (completed: boolean) => {
    setOnboardingState(prev => ({ ...prev, profileCompleted: completed }));
    updateOnboardingProgress({ profileCompleted: completed });
  };

  const setFirstActionCompleted = (completed: boolean) => {
    setOnboardingState(prev => ({ ...prev, firstActionCompleted: completed }));
    updateOnboardingProgress({ firstActionCompleted: completed });
  };

  const updateOnboardingProgress = async (updates: Partial<OnboardingState>) => {
    try {
      await fetch('/api/user/onboarding-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await fetch('/api/user/complete-onboarding', {
        method: 'POST',
      });
      setOnboardingState(prev => ({
        ...prev,
        isOnboardingActive: false,
        showOnboarding: false,
        currentStep: 'completed',
      }));
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    try {
      await fetch('/api/user/skip-onboarding', {
        method: 'POST',
      });
      setOnboardingState(prev => ({
        ...prev,
        isOnboardingActive: false,
        showOnboarding: false,
        currentStep: 'completed',
      }));
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const startOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isOnboardingActive: true,
      showOnboarding: true,
      currentStep: 'role_selection',
    }));
  };

  const getNextStep = (): OnboardingStep | null => {
    const { currentStep, selectedRole, profileCompleted, firstActionCompleted } = onboardingState;
    
    switch (currentStep) {
      case 'role_selection':
        return selectedRole ? 'profile_setup' : null;
      case 'profile_setup':
        return profileCompleted ? 'first_action' : null;
      case 'first_action':
        return firstActionCompleted ? 'completed' : null;
      default:
        return null;
    }
  };

  const getProgressPercentage = (): number => {
    const { currentStep, selectedRole, profileCompleted, firstActionCompleted } = onboardingState;
    
    let progress = 0;
    if (selectedRole) progress += 25;
    if (profileCompleted) progress += 25;
    if (firstActionCompleted) progress += 25;
    if (currentStep === 'completed') progress += 25;
    
    return progress;
  };

  const value: OnboardingContextType = {
    onboardingState,
    setCurrentStep,
    setSelectedRole,
    setProfileCompleted,
    setFirstActionCompleted,
    completeOnboarding,
    skipOnboarding,
    startOnboarding,
    getNextStep,
    getProgressPercentage,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
