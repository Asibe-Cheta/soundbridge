'use client';

import React from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';

export function OnboardingDebug() {
  const { onboardingState, startOnboarding } = useOnboarding();
  const { user } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#EC4899' }}>Onboarding Debug</h4>
      <div>User ID: {user?.id || 'Not logged in'}</div>
      <div>Show Onboarding: {onboardingState.showOnboarding ? 'Yes' : 'No'}</div>
      <div>Current Step: {onboardingState.currentStep}</div>
      <div>Selected Role: {onboardingState.selectedRole || 'None'}</div>
      <div>Profile Completed: {onboardingState.profileCompleted ? 'Yes' : 'No'}</div>
      <div>First Action Completed: {onboardingState.firstActionCompleted ? 'Yes' : 'No'}</div>
      <div>Is Active: {onboardingState.isOnboardingActive ? 'Yes' : 'No'}</div>
      
      {!onboardingState.showOnboarding && (
        <button
          onClick={startOnboarding}
          style={{
            marginTop: '10px',
            padding: '5px 10px',
            background: '#EC4899',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Start Onboarding
        </button>
      )}
    </div>
  );
}

