'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

export type UserRole = 'musician' | 'podcaster' | 'event_promoter' | 'listener';
export type OnboardingUserType = 'music_creator' | 'podcast_creator' | 'industry_professional' | 'music_lover' | null;
// Support both old and new flow steps
export type OnboardingStep = 
  // Old flow
  'role_selection' | 'profile_setup' | 'first_action' | 'completed' |
  // New flow (from ONBOARDING_NEW_FLOW.md)
  'welcome' | 'userType' | 'quickSetup' | 'valueDemo' | 'tierSelection' | 'payment' | 'welcomeConfirmation';

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedRole: UserRole | null;
  onboardingUserType: OnboardingUserType; // NEW: User type from new flow
  profileCompleted: boolean;
  firstActionCompleted: boolean;
  selectedTier: 'free' | 'pro' | null; // NEW: Selected tier during onboarding
  isOnboardingActive: boolean;
  showOnboarding: boolean;
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  setCurrentStep: (step: OnboardingStep) => void;
  setSelectedRole: (role: UserRole) => void;
  setOnboardingUserType: (userType: OnboardingUserType) => void; // NEW
  setSelectedTier: (tier: 'free' | 'pro' | null) => void; // NEW
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

const ONBOARDING_STORAGE_KEY = 'soundbridge_onboarding_state';

// Load onboarding state from localStorage
const loadOnboardingStateFromStorage = (): Partial<OnboardingState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading onboarding state from storage:', error);
  }
  return null;
};

// Save onboarding state to localStorage
const saveOnboardingStateToStorage = (state: OnboardingState, user: any, session: any) => {
  if (typeof window === 'undefined') return;
  try {
    // CRITICAL: Only save if user is authenticated
    // This prevents persisting state for unauthenticated users
    if (!user || !session) {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      return;
    }

    // Only save if onboarding is active (don't persist completed state)
    if (state.isOnboardingActive || state.showOnboarding) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        currentStep: state.currentStep,
        selectedRole: state.selectedRole,
        onboardingUserType: state.onboardingUserType,
        selectedTier: state.selectedTier,
        profileCompleted: state.profileCompleted,
        firstActionCompleted: state.firstActionCompleted,
        isOnboardingActive: state.isOnboardingActive,
        showOnboarding: state.showOnboarding,
      }));
    } else {
      // Clear storage if onboarding is not active
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error saving onboarding state to storage:', error);
  }
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, session, loading: authLoading, signOut } = useAuth();
  
  // Initialize state - only load from localStorage if user is authenticated
  // This prevents showing onboarding for unauthenticated users
  const storedState = (user && session) ? loadOnboardingStateFromStorage() : null;
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    currentStep: (storedState?.currentStep as OnboardingStep) || 'welcome',
    selectedRole: storedState?.selectedRole || null,
    onboardingUserType: storedState?.onboardingUserType || null,
    profileCompleted: storedState?.profileCompleted || false,
    firstActionCompleted: storedState?.firstActionCompleted || false,
    selectedTier: storedState?.selectedTier || null,
    isOnboardingActive: (user && session && storedState?.isOnboardingActive) || false,
    showOnboarding: (user && session && storedState?.showOnboarding) || false,
  });

  // Save state to localStorage whenever it changes
  // CRITICAL: Only save if user is authenticated
  useEffect(() => {
    saveOnboardingStateToStorage(onboardingState, user, session);
  }, [onboardingState, user, session]);

  // Restore onboarding state when component mounts or tab regains focus
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to our own storage key changes from other tabs
      if (e.key === ONBOARDING_STORAGE_KEY && e.newValue) {
        try {
          const storedState = JSON.parse(e.newValue);
          if (storedState && (storedState.showOnboarding || storedState.isOnboardingActive)) {
            console.log('🔄 Onboarding state changed in another tab, syncing...');
            setOnboardingState(prev => ({
              ...prev,
              showOnboarding: storedState.showOnboarding || prev.showOnboarding,
              isOnboardingActive: storedState.isOnboardingActive || prev.isOnboardingActive,
              currentStep: (storedState.currentStep as OnboardingStep) || prev.currentStep,
            }));
          }
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check if user needs onboarding on mount and when tab regains focus
  useEffect(() => {
    // Wait for auth to finish loading before checking onboarding
    if (authLoading) return;
    
    const checkOnboarding = () => {
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
              currentStep: 'welcome', // NEW: Start with welcome screen
            }));
          }, 1000); // Small delay to ensure user context is ready
        } else {
          // If onboarding is already showing from storage, don't re-check
          // Only re-check if onboarding is not currently active
          if (!onboardingState.showOnboarding && !onboardingState.isOnboardingActive) {
            // Add delay after sign-in to allow cookies to be set before checking onboarding
            const delay = session ? 1500 : 0; // Give extra time if we just signed in
            setTimeout(() => {
              checkOnboardingStatusWithRetry();
            }, delay);
          } else {
            // If onboarding is already showing, verify it's still needed
            console.log('🔄 Onboarding already showing, verifying status...');
            checkOnboardingStatusWithRetry();
          }
        }
      } else {
        // User is not authenticated - ALWAYS reset onboarding state
        // Clear localStorage and reset state completely
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
        setOnboardingState({
          currentStep: 'welcome',
          selectedRole: null,
          onboardingUserType: null,
          profileCompleted: false,
          firstActionCompleted: false,
          selectedTier: null,
          isOnboardingActive: false,
          showOnboarding: false,
        });
      }
    };

    // Initial check
    checkOnboarding();

    // Re-check when tab regains focus (user switches back to tab)
    const handleVisibilityChange = () => {
      // Only restore if user is authenticated
      if (!document.hidden && user && session) {
        console.log('👁️ Tab regained focus, restoring onboarding state...');
        
        // First, restore state from localStorage if onboarding was active
        const storedState = loadOnboardingStateFromStorage();
        if (storedState && (storedState.showOnboarding || storedState.isOnboardingActive)) {
          console.log('🔄 Restoring onboarding state from localStorage');
          setOnboardingState(prev => ({
            ...prev,
            showOnboarding: storedState.showOnboarding || false,
            isOnboardingActive: storedState.isOnboardingActive || false,
            currentStep: (storedState.currentStep as OnboardingStep) || prev.currentStep,
            onboardingUserType: storedState.onboardingUserType || prev.onboardingUserType,
            selectedTier: storedState.selectedTier || prev.selectedTier,
          }));
          
          // Only verify with API if we're not sure about the state
          // Don't immediately re-check as it might hide the modal
          setTimeout(() => {
            // Silently verify in background, but don't hide if already showing
            verifyOnboardingStatusSilently();
          }, 1000);
        } else {
          // If no stored state, check normally
          setTimeout(() => {
            checkOnboardingStatusWithRetry();
          }, 500);
        }
      } else if (!document.hidden && (!user || !session)) {
        // User is not authenticated - clear onboarding state
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
        setOnboardingState(prev => ({
          ...prev,
          isOnboardingActive: false,
          showOnboarding: false,
        }));
      }
    };

    // Re-check when window regains focus
    const handleFocus = () => {
      if (user && session) {
        console.log('👁️ Window regained focus, restoring onboarding state...');
        
        // First, restore state from localStorage if onboarding was active
        const storedState = loadOnboardingStateFromStorage();
        if (storedState && (storedState.showOnboarding || storedState.isOnboardingActive)) {
          console.log('🔄 Restoring onboarding state from localStorage');
          setOnboardingState(prev => ({
            ...prev,
            showOnboarding: storedState.showOnboarding || false,
            isOnboardingActive: storedState.isOnboardingActive || false,
            currentStep: (storedState.currentStep as OnboardingStep) || prev.currentStep,
            onboardingUserType: storedState.onboardingUserType || prev.onboardingUserType,
            selectedTier: storedState.selectedTier || prev.selectedTier,
          }));
          
          // Only verify with API if we're not sure about the state
          setTimeout(() => {
            verifyOnboardingStatusSilently();
          }, 1000);
        } else {
          // If no stored state, check normally
          setTimeout(() => {
            checkOnboardingStatusWithRetry();
          }, 500);
        }
      } else {
        // User is not authenticated - clear onboarding state
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
        setOnboardingState(prev => ({
          ...prev,
          isOnboardingActive: false,
          showOnboarding: false,
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, session, authLoading]);

  const checkOnboardingStatus = async (): Promise<{ success: boolean; status: number }> => {
    try {
      console.log('🔍 Checking onboarding status for user:', user?.id);
      
      // Use fetchJsonWithAuth for consistent bearer token auth
      const { data, error, response } = await fetchJsonWithAuth('/api/user/onboarding-status');

      if (error || !response.ok) {
        if (response?.status === 401) {
          // Authentication failed - but don't clear session immediately
          // It might be a temporary issue, especially right after sign-in
          console.error('❌ Authentication failed for onboarding status check (401)');
          return { success: false, status: 401 };
        }
        console.error('❌ Failed to check onboarding status:', error);
        return { success: false, status: response?.status || 500 };
      }

      if (data) {
        console.log('📊 Onboarding status response:', data);
        
        if (data.needsOnboarding) {
          console.log('🎯 User needs onboarding, showing modal');
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: true,
            showOnboarding: true,
            currentStep: data.onboarding?.step || 'welcome',
            selectedRole: data.profile?.role || null,
            onboardingUserType: data.profile?.onboarding_user_type || null, // NEW
            profileCompleted: data.onboarding?.profileCompleted || false,
            firstActionCompleted: false,
            selectedTier: null,
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

  // Silent verification that doesn't hide the modal if it's already showing
  const verifyOnboardingStatusSilently = async () => {
    try {
      if (!user || !session) return;
      
      const { data, error, response } = await fetchJsonWithAuth('/api/user/onboarding-status');
      
      if (error || !response.ok) {
        // If API check fails, keep the current state (don't hide modal)
        console.log('⚠️ Onboarding status check failed, keeping current state');
        return;
      }
      
      if (data) {
        // Only update if onboarding is actually completed (don't hide if still needed)
        if (!data.needsOnboarding && onboardingState.showOnboarding) {
          console.log('✅ Onboarding completed, hiding modal');
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: false,
            showOnboarding: false,
            currentStep: 'completed',
          }));
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        } else if (data.needsOnboarding && !onboardingState.showOnboarding) {
          // If onboarding is needed but not showing, show it
          console.log('🎯 Onboarding needed, showing modal');
          setOnboardingState(prev => ({
            ...prev,
            isOnboardingActive: true,
            showOnboarding: true,
            currentStep: data.onboarding?.step || prev.currentStep,
          }));
        }
        // If state matches, do nothing (don't hide if already showing)
      }
    } catch (error) {
      // Silently fail - keep current state
      console.log('⚠️ Silent onboarding verification failed, keeping current state');
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
    // Only update progress if user is available - don't block step changes
    if (user?.id) {
      updateOnboardingProgress({ currentStep: step });
    }
  };

  const setSelectedRole = (role: UserRole) => {
    setOnboardingState(prev => ({ ...prev, selectedRole: role }));
    updateOnboardingProgress({ selectedRole: role });
  };

  const setOnboardingUserType = (userType: OnboardingUserType) => {
    setOnboardingState(prev => ({ ...prev, onboardingUserType: userType }));
    updateOnboardingProgress({ userType: userType });
  };

  const setSelectedTier = (tier: 'free' | 'pro' | null) => {
    setOnboardingState(prev => ({ ...prev, selectedTier: tier }));
  };

  const setProfileCompleted = (completed: boolean) => {
    setOnboardingState(prev => ({ ...prev, profileCompleted: completed }));
    updateOnboardingProgress({ profileCompleted: completed });
  };

  const setFirstActionCompleted = (completed: boolean) => {
    setOnboardingState(prev => ({ ...prev, firstActionCompleted: completed }));
    updateOnboardingProgress({ firstActionCompleted: completed });
  };

  const updateOnboardingProgress = async (updates: Partial<OnboardingState> & { userType?: OnboardingUserType; currentStep?: OnboardingStep }) => {
    try {
      // Get current user from context - don't use captured value in retry loop
      let currentUser = user;
      
      // If user is not available yet, wait for it with retries
      if (!currentUser?.id) {
        // Wait up to 3 seconds for user to become available
        let attempts = 0;
        const maxAttempts = 6;
        const retryDelay = 500; // 500ms between attempts
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`⏳ Waiting for user ID (attempt ${attempts}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Re-check user from context (it might have loaded while we waited)
          // Note: We can't directly access the latest user here, so we'll check once more after retries
        }
        
        // Final check - user might have loaded during retry period
        // If still not available, skip the update but don't block UI
        if (!user?.id) {
          console.warn('⚠️ No user ID available for updating onboarding progress - skipping update');
          // Don't block the UI - progress updates are non-critical
          return;
        }
      }

      // Map onboardingUserType to userType for API
      const apiUpdates: any = {
        ...updates,
        userId: user.id
      };

      // Map onboardingUserType to userType for API compatibility
      if (updates.onboardingUserType !== undefined) {
        apiUpdates.userType = updates.onboardingUserType;
      }

      // Use fetchJsonWithAuth for consistent bearer token auth
      await fetchJsonWithAuth('/api/user/onboarding-progress', {
        method: 'POST',
        body: JSON.stringify(apiUpdates),
      });
    } catch (error) {
      console.error('❌ Error updating onboarding progress:', error);
      // Don't throw - allow onboarding to continue even if progress update fails
    }
  };

  const completeOnboarding = async () => {
    try {
      if (!user?.id) {
        console.error('❌ No user ID available for completing onboarding');
        return;
      }

      console.log('🔧 Completing onboarding for user:', user.id);
      
      // Use fetchJsonWithAuth for consistent bearer token auth
      const { data, error } = await fetchJsonWithAuth('/api/user/complete-onboarding', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id
        }),
      });
      
      if (error || !data?.success) {
        console.error('❌ Failed to complete onboarding:', error || data?.error);
        return;
      }

      console.log('✅ Onboarding completed successfully');
      setOnboardingState(prev => ({
        ...prev,
        isOnboardingActive: false,
        showOnboarding: false,
        currentStep: 'completed',
      }));
      // Clear storage when onboarding is completed
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
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
      
      // Use fetchJsonWithAuth for consistent bearer token auth
      const { data, error } = await fetchJsonWithAuth('/api/user/skip-onboarding', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id
        }),
      });
      
      if (error || !data?.success) {
        console.error('❌ Failed to skip onboarding:', error || data?.error);
        return;
      }

      console.log('✅ Onboarding skipped successfully');
      setOnboardingState(prev => ({
        ...prev,
        isOnboardingActive: false,
        showOnboarding: false,
        currentStep: 'completed',
      }));
      // Clear storage when onboarding is skipped
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
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
      currentStep: 'welcome', // NEW: Start with welcome screen
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
    setOnboardingUserType, // NEW
    setSelectedTier, // NEW
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
