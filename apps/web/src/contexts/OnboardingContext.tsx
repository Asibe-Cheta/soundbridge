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
  const { user, session, loading: authLoading, signOut } = useAuth();
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
    // Wait for auth to finish loading before checking onboarding
    if (authLoading) return;
    
    // Only check onboarding if user has a valid session (actually authenticated)
    // This prevents checking when user exists but session is expired
    if (user && session) {
      // Check for onboarding URL parameter (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const shouldStartOnboarding = urlParams.get('onboarding') === 'true';
      
      if (shouldStartOnboarding) {
        console.log('🎯 Starting onboarding from URL parameter');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        // Force start onboarding
        setTimeout(() => {
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: true,
            showOnboarding: true,
            currentStep: 'role_selection',
          }));
        }, 1000); // Small delay to ensure user context is ready
      } else {
        // Add delay after sign-in to allow cookies to be set before checking onboarding
        const delay = session ? 1500 : 0; // Give extra time if we just signed in
        setTimeout(() => {
          checkOnboardingStatusWithRetry();
        }, delay);
      }
    } else {
      // Reset onboarding state when user logs out or has no valid session
      setOnboardingState({
        currentStep: 'role_selection',
        selectedRole: null,
        profileCompleted: false,
        firstActionCompleted: false,
        isOnboardingActive: false,
        showOnboarding: false,
      });
    }
  }, [user, session, authLoading]);

  const checkOnboardingStatus = async (): Promise<{ success: boolean; status: number }> => {
    try {
      console.log('🔍 Checking onboarding status for user:', user?.id);
      const response = await fetch('/api/user/onboarding-status', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Authentication failed - session is expired, clear it
        console.error('❌ Authentication failed for onboarding status check - clearing session');
        // Clear the expired session
        await signOut();
        return { success: false, status: 401 };
      }

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Onboarding status response:', data);
        
        if (data.needsOnboarding) {
          console.log('🎯 User needs onboarding, showing modal');
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: true,
            showOnboarding: true,
            currentStep: data.onboarding?.step || 'role_selection',
            selectedRole: data.profile?.role || null,
            profileCompleted: data.onboarding?.profileCompleted || false,
            firstActionCompleted: false,
          }));
        } else {
          console.log('✅ User onboarding already completed');
          // Ensure onboarding is hidden if already completed
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: false,
            showOnboarding: false,
            currentStep: 'completed',
          }));
        }
        return { success: true, status: response.status };
      } else {
        console.error('❌ Failed to check onboarding status:', response.status);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return { success: false, status: 0 };
    }
  };

  // Retry logic for onboarding status check
  const checkOnboardingStatusWithRetry = async () => {
    // Double-check we have valid session before even starting
    if (!user || !session) {
      console.log('🔒 No valid session - skipping onboarding check');
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 1000;

    while (attempts < maxAttempts) {
      // Check if user is still authenticated with valid session before each attempt
      if (!user || !session) {
        console.log('🔒 User no longer authenticated or session expired, stopping retry');
        return;
      }
      
      console.log(`🔄 Onboarding status check attempt ${attempts + 1}/${maxAttempts}`);
      
      const result = await checkOnboardingStatus();
      
      if (result.success) {
        return; // Success, exit retry loop
      }
      
      // If we got a 401, don't retry - authentication issue won't be fixed by retrying
      if (result.status === 401) {
        console.log('🔒 Authentication failed (401) - stopping retries');
        console.log('🔒 Authentication failed - not showing onboarding modal');
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`⏳ Retrying onboarding check in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    console.error('❌ Failed to check onboarding status after all retries');
    // Don't show onboarding modal if authentication fails - let user try to log in again
    console.log('🔒 Authentication failed - not showing onboarding modal');
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
      if (!user?.id) {
        console.error('❌ No user ID available for updating onboarding progress');
        return;
      }

      await fetch('/api/user/onboarding-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          userId: user.id
        }),
      });
    } catch (error) {
      console.error('❌ Error updating onboarding progress:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      if (!user?.id) {
        console.error('❌ No user ID available for completing onboarding');
        return;
      }

      console.log('🔧 Completing onboarding for user:', user.id);
      
      const response = await fetch('/api/user/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Onboarding completed successfully');
        setOnboardingState(prev => ({
          ...prev,
          isOnboardingActive: false,
          showOnboarding: false,
          currentStep: 'completed',
        }));
      } else {
        console.error('❌ Failed to complete onboarding:', result.error);
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    try {
      if (!user?.id) {
        console.error('❌ No user ID available for skipping onboarding');
        return;
      }

      console.log('🔧 Skipping onboarding for user:', user.id);
      
      const response = await fetch('/api/user/skip-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Onboarding skipped successfully');
        setOnboardingState(prev => ({
          ...prev,
          isOnboardingActive: false,
          showOnboarding: false,
          currentStep: 'completed',
        }));
      } else {
        console.error('❌ Failed to skip onboarding:', result.error);
      }
    } catch (error) {
      console.error('❌ Error skipping onboarding:', error);
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
