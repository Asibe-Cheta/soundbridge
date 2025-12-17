'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentry() {
  const triggerError = () => {
    throw new Error('This is a test error from SoundBridge!');
  };

  const triggerManualCapture = () => {
    Sentry.captureMessage('Test message from SoundBridge', 'info');
    alert('Test message sent to Sentry! Check your Sentry dashboard.');
  };

  const triggerDatabaseError = () => {
    // Simulate a database column error
    const error = new Error('column audio_tracks.artist does not exist');
    Sentry.captureException(error, {
      tags: {
        method: 'testDatabaseError',
        table: 'audio_tracks',
      },
      extra: {
        query: 'SELECT id, title, artist FROM audio_tracks',
        errorType: 'PostgrestError',
      },
    });
    alert('Database error simulation sent to Sentry! Check your dashboard.');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Sentry Test Page</h1>

      <p style={{ marginBottom: '30px', color: '#666' }}>
        Use these buttons to test your Sentry integration. Make sure you've temporarily
        enabled Sentry in development mode first!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button
          onClick={triggerManualCapture}
          style={{
            padding: '15px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ✅ Send Test Message (Safe)
        </button>

        <button
          onClick={triggerDatabaseError}
          style={{
            padding: '15px 20px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          📊 Simulate Database Error (Safe)
        </button>

        <button
          onClick={triggerError}
          style={{
            padding: '15px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          💥 Trigger Error (Will Crash Page)
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Testing Instructions:</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>
            <strong>Enable Sentry in dev:</strong> In{' '}
            <code>instrumentation-client.ts</code>, temporarily change line 38 to{' '}
            <code>enabled: true</code>
          </li>
          <li>
            <strong>Restart dev server:</strong> Stop and run <code>npm run dev</code> again
          </li>
          <li>
            <strong>Test the buttons:</strong> Click each button and check Sentry dashboard
          </li>
          <li>
            <strong>Disable after testing:</strong> Change back to{' '}
            <code>enabled: process.env.NODE_ENV === 'production'</code>
          </li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
        <strong>Note:</strong> This page is only for testing. Delete it before deploying to
        production or make sure it's not accessible to users.
      </div>
    </div>
  );
}
