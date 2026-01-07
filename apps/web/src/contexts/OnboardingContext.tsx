'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
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
  selectedTier: 'free' | 'premium' | 'unlimited' | null; // NEW: Selected tier during onboarding
  isOnboardingActive: boolean;
  showOnboarding: boolean;
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  setCurrentStep: (step: OnboardingStep) => void;
  setSelectedRole: (role: UserRole) => void;
  setOnboardingUserType: (userType: OnboardingUserType) => void; // NEW
  setSelectedTier: (tier: 'free' | 'premium' | 'unlimited' | null) => void; // NEW
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
  
  // CRITICAL: Prevent infinite loops - guards
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const hasInitialCheckRef = useRef(false);
  
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

  // CRITICAL: Stable visibility handler with guards
  const handleVisibilityChange = useCallback(() => {
    // Guard 1: Don't run if already checking
    if (isCheckingRef.current) {
      console.log('⏭️ Onboarding check already in progress, skipping visibility change...');
      return;
    }
    
    // Guard 2: Debounce - don't check more than once per 5 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 5000) {
      console.log('⏭️ Onboarding check too soon, skipping visibility change...');
      return;
    }
    
    // Guard 3: Must have user and session, and document must be visible
    if (document.hidden || !user || !session) {
      return;
    }
    
    console.log('👁️ Window regained focus, checking onboarding state...');
    
    // Restore state from localStorage if onboarding was active
    const storedState = loadOnboardingStateFromStorage();
    if (storedState && (storedState.showOnboarding || storedState.isOnboardingActive)) {
      console.log('🔄 Restoring onboarding state from localStorage');
      
      // CRITICAL: Only update if state actually changed
      setOnboardingState(prev => {
        const newState = {
          ...prev,
          showOnboarding: storedState.showOnboarding || false,
          isOnboardingActive: storedState.isOnboardingActive || false,
          currentStep: (storedState.currentStep as OnboardingStep) || prev.currentStep,
          onboardingUserType: storedState.onboardingUserType || prev.onboardingUserType,
          selectedTier: storedState.selectedTier || prev.selectedTier,
        };
        
        // Don't update if nothing changed
        if (
          prev.showOnboarding === newState.showOnboarding &&
          prev.isOnboardingActive === newState.isOnboardingActive &&
          prev.currentStep === newState.currentStep &&
          prev.onboardingUserType === newState.onboardingUserType &&
          prev.selectedTier === newState.selectedTier
        ) {
          console.log('⏭️ Onboarding state unchanged, skipping update');
          return prev;
        }
        
        return newState;
      });
      
      // Only verify with API if we're not sure about the state
      setTimeout(() => {
        verifyOnboardingStatusSilently();
      }, 1000);
    } else {
      // If no stored state, check normally (with debounce)
      setTimeout(() => {
        checkOnboardingStatusWithRetry();
      }, 500);
    }
  }, [user, session]);

  // Define functions BEFORE useEffects that use them
  const checkOnboardingStatus = useCallback(async (): Promise<{ success: boolean; status: number }> => {
    // Guard: Don't run if already checking
    if (isCheckingRef.current) {
      console.log('⏭️ Onboarding check already in progress, skipping...');
      return { success: false, status: 0 };
    }
    
    // Guard: Must have user and session
    if (!user || !session) {
      console.log('⏭️ No user/session, skipping onboarding check');
      return { success: false, status: 0 };
    }
    
    isCheckingRef.current = true;
    
    try {
      console.log('🔍 Checking onboarding status for user:', user?.id);
      
      // Use fetchJsonWithAuth for consistent bearer token auth
      const { data, error, response } = await fetchJsonWithAuth('/api/user/onboarding-status');

      if (error || !response.ok) {
        if (response?.status === 401) {
          console.error('❌ Authentication failed for onboarding status check (401)');
          return { success: false, status: 401 };
        }
        console.error('❌ Failed to check onboarding status:', error);
        return { success: false, status: response?.status || 500 };
      }

      if (data) {
        console.log('📊 Onboarding status response:', data);
        
        // CRITICAL: Only update if state actually changed
        setOnboardingState(prev => {
          if (data.needsOnboarding) {
            const newState = {
              ...prev,
              isOnboardingActive: true,
              showOnboarding: true,
              currentStep: data.onboarding?.step || 'welcome',
              selectedRole: data.profile?.role || null,
              onboardingUserType: data.profile?.onboarding_user_type || null,
              profileCompleted: data.onboarding?.profileCompleted || false,
              firstActionCompleted: false,
              selectedTier: null,
            };
            
            // Don't update if nothing changed
            if (
              prev.isOnboardingActive === newState.isOnboardingActive &&
              prev.showOnboarding === newState.showOnboarding &&
              prev.currentStep === newState.currentStep &&
              prev.selectedRole === newState.selectedRole &&
              prev.onboardingUserType === newState.onboardingUserType &&
              prev.profileCompleted === newState.profileCompleted
            ) {
              console.log('⏭️ Onboarding state unchanged, skipping update');
              return prev;
            }
            
            console.log('✅ User needs onboarding, showing modal');
            return newState;
          } else {
            const newState = {
              ...prev,
              isOnboardingActive: false,
              showOnboarding: false,
              currentStep: 'completed',
            };
            
            // Don't update if nothing changed
            if (
              prev.isOnboardingActive === newState.isOnboardingActive &&
              prev.showOnboarding === newState.showOnboarding &&
              prev.currentStep === newState.currentStep
            ) {
              console.log('⏭️ Onboarding state unchanged, skipping update');
              return prev;
            }
            
            console.log('✅ User onboarding already completed');
            return newState;
          }
        });
        
        return { success: true, status: response.status };
      } else {
        console.error('❌ Failed to check onboarding status:', response.status);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return { success: false, status: 0 };
    } finally {
      isCheckingRef.current = false;
      lastCheckTimeRef.current = Date.now();
    }
  }, [user, session]);

  // Silent verification that doesn't hide the modal if it's already showing
  const verifyOnboardingStatusSilently = useCallback(async () => {
    // Guard: Don't run if already checking
    if (isCheckingRef.current) {
      console.log('⏭️ Onboarding check already in progress, skipping silent verification...');
      return;
    }
    
    try {
      if (!user || !session) return;
      
      const { data, error, response } = await fetchJsonWithAuth('/api/user/onboarding-status');
      
      if (error || !response.ok) {
        // If API check fails, keep the current state (don't hide modal)
        console.log('⚠️ Onboarding status check failed, keeping current state');
        return;
      }
      
      if (data) {
        // CRITICAL: Only update if state actually changed
        setOnboardingState(prev => {
          // Only update if onboarding is actually completed (don't hide if still needed)
          if (!data.needsOnboarding && prev.showOnboarding) {
            const newState = {
              ...prev,
              isOnboardingActive: false,
              showOnboarding: false,
              currentStep: 'completed',
            };
            
            // Don't update if nothing changed
            if (
              prev.isOnboardingActive === newState.isOnboardingActive &&
              prev.showOnboarding === newState.showOnboarding &&
              prev.currentStep === newState.currentStep
            ) {
              return prev;
            }
            
            console.log('✅ Onboarding completed, hiding modal');
            localStorage.removeItem(ONBOARDING_STORAGE_KEY);
            return newState;
          } else if (data.needsOnboarding && !prev.showOnboarding) {
            // If onboarding is needed but not showing, show it
            const newState = {
              ...prev,
              isOnboardingActive: true,
              showOnboarding: true,
              currentStep: data.onboarding?.step || prev.currentStep,
            };
            
            // Don't update if nothing changed
            if (
              prev.isOnboardingActive === newState.isOnboardingActive &&
              prev.showOnboarding === newState.showOnboarding &&
              prev.currentStep === newState.currentStep
            ) {
              return prev;
            }
            
            console.log('🎯 Onboarding needed, showing modal');
            return newState;
          }
          
          // If state matches, do nothing (don't hide if already showing)
          return prev;
        });
      }
    } catch (error) {
      // Silently fail - keep current state
      console.log('⚠️ Silent onboarding verification failed, keeping current state');
    }
  }, [user, session]);

  // Retry logic for onboarding status check - CRITICAL: Stable function
  const checkOnboardingStatusWithRetry = useCallback(async () => {
    // Guard: Don't run if already checking
    if (isCheckingRef.current) {
      console.log('⏭️ Onboarding check already in progress, skipping retry...');
      return;
    }
    
    // Guard: Debounce - don't check more than once per 5 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 5000) {
      console.log('⏭️ Onboarding check too soon, skipping retry...');
      return;
    }
    
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
  }, [user, session, checkOnboardingStatus]);

  // Initial check - only run once when user is available
  useEffect(() => {
    // Wait for auth to finish loading before checking onboarding
    if (authLoading) return;
    
    // Guard: Only check once
    if (hasInitialCheckRef.current) return;
    
    // Only check onboarding if user has a valid session (actually authenticated)
    if (user && session) {
      hasInitialCheckRef.current = true;
      
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
            currentStep: 'welcome',
          }));
        }, 1000);
      } else {
        // If onboarding is already showing from storage, don't re-check
        // Only re-check if onboarding is not currently active
        if (!onboardingState.showOnboarding && !onboardingState.isOnboardingActive) {
          // CRITICAL FIX: Add longer delay after sign-in to allow cookies to be set
          const delay = session ? 3000 : 0;
          console.log(`⏱️ Delaying onboarding check for ${delay}ms to allow cookie sync...`);
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
  }, [user, session, authLoading, onboardingState.showOnboarding, onboardingState.isOnboardingActive, checkOnboardingStatusWithRetry]);

  // Effect 2: Visibility change listener
  useEffect(() => {
    // Only add listener if user is authenticated
    if (!user || !session) return;
    
    console.log('👂 Adding visibility change listener');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('🧹 Removing visibility change listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, session, handleVisibilityChange]);

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

  const setSelectedTier = (tier: 'free' | 'premium' | 'unlimited' | null) => {
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

  // CRITICAL: Memoize context value to prevent unnecessary re-renders
  const value: OnboardingContextType = useMemo(() => ({
    onboardingState,
    setCurrentStep,
    setSelectedRole,
    setOnboardingUserType,
    setSelectedTier,
    setProfileCompleted,
    setFirstActionCompleted,
    completeOnboarding,
    skipOnboarding,
    startOnboarding,
    getNextStep,
    getProgressPercentage,
  }), [
    onboardingState,
    setCurrentStep,
    setSelectedRole,
    setOnboardingUserType,
    setSelectedTier,
    setProfileCompleted,
    setFirstActionCompleted,
    completeOnboarding,
    skipOnboarding,
    startOnboarding,
    getNextStep,
    getProgressPercentage,
  ]);

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
