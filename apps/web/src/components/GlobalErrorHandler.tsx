'use client';

import React, { useEffect } from 'react';

export function GlobalErrorHandler() {
  useEffect(() => {
    // Global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.warn('Global error caught:', event.error);
      
      // Check if it's a DOM manipulation error
      if (event.error?.message?.includes('removeChild') || 
          event.error?.message?.includes('not a child of this node')) {
        console.warn('Contains DOM manipulation error, preventing crash');
        event.preventDefault();
        return false;
      }
    };

    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection:', event.reason);
      
      // Check if it's a DOM manipulation error
      if (event.reason?.message?.includes('removeChild') || 
          event.reason?.message?.includes('not a child of this node')) {
        console.warn('Contains DOM manipulation error in promise, preventing crash');
        event.preventDefault();
        return false;
      }
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // This component doesn't render anything
}
