'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/src/lib/supabase';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Test environment variables
        const envCheck = {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
        };

        // Test Supabase client creation
        let supabaseClient = null;
        let supabaseError = null;
        try {
          supabaseClient = createBrowserClient();
        } catch (err) {
          supabaseError = err instanceof Error ? err.message : 'Unknown error';
        }

        // Test API endpoints
        const apiTests: {
          personalizedFeed: any;
          recentTracks: any;
          trendingTracks: any;
        } = {
          personalizedFeed: null,
          recentTracks: null,
          trendingTracks: null,
        };

        try {
          const response = await fetch('/api/test-env');
          const envApiResult = await response.json();
          apiTests.personalizedFeed = envApiResult;
        } catch (err) {
          apiTests.personalizedFeed = { error: err instanceof Error ? err.message : 'Unknown error' };
        }

        try {
          const response = await fetch('/api/audio/recent');
          const result = await response.json();
          apiTests.recentTracks = { status: response.status, success: response.ok, data: result };
        } catch (err) {
          apiTests.recentTracks = { error: err instanceof Error ? err.message : 'Unknown error' };
        }

        try {
          const response = await fetch('/api/audio/trending');
          const result = await response.json();
          apiTests.trendingTracks = { status: response.status, success: response.ok, data: result };
        } catch (err) {
          apiTests.trendingTracks = { error: err instanceof Error ? err.message : 'Unknown error' };
        }

        setDebugInfo({
          timestamp: new Date().toISOString(),
          environment: envCheck,
          supabaseClient: supabaseClient ? 'Created successfully' : 'Failed to create',
          supabaseError,
          apiTests,
          userAgent: navigator.userAgent,
          url: window.location.href,
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>Running diagnostics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>
          <h1 style={{ color: '#DC2626', marginBottom: '1rem' }}>Diagnostic Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <h1 style={{ marginBottom: '2rem', color: '#DC2626' }}>SoundBridge Debug Information</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Environment Variables</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify(debugInfo?.environment, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Supabase Client</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            status: debugInfo?.supabaseClient,
            error: debugInfo?.supabaseError
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>API Tests</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify(debugInfo?.apiTests, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>System Information</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            timestamp: debugInfo?.timestamp,
            userAgent: debugInfo?.userAgent,
            url: debugInfo?.url
          }, null, 2)}
        </pre>
      </div>

      <button 
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        Refresh Diagnostics
      </button>
    </div>
  );
}
