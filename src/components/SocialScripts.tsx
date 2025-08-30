'use client';

import { useEffect } from 'react';

export function SocialScripts() {
  useEffect(() => {
    // Initialize YouTube API when the component mounts
    const initializeYouTubeAPI = () => {
      if (typeof window !== 'undefined' && window.gapi) {
        window.gapi.load('auth2', function() {
          window.gapi.auth2.init({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
          });
        });
      }
    };

    // Wait for the script to load
    const checkGAPI = () => {
      if (typeof window !== 'undefined' && window.gapi) {
        initializeYouTubeAPI();
      } else {
        // Retry after a short delay
        setTimeout(checkGAPI, 100);
      }
    };

    // Start checking for gapi
    checkGAPI();
  }, []);

  return null;
}
