'use client';

import React, { useState } from 'react';

export default function TestSignupEmailPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-signup-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', color: '#EC4899' }}>Test Signup Email Flow</h1>
        
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          padding: '1.5rem', 
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>Instructions:</h3>
          <ol style={{ color: '#ccc', lineHeight: '1.6' }}>
            <li>Enter your email address below</li>
            <li>Click "Test Signup Email"</li>
            <li>Check your email inbox for the verification email</li>
            <li>If you receive the email, your auth hook is working!</li>
          </ol>
        </div>
        
        <form onSubmit={handleTest} style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                background: 'white',
                color: '#333',
                fontSize: '1rem'
              }}
              placeholder="Enter your email address"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            {loading ? 'Testing...' : 'Test Signup Email'}
          </button>
        </form>

        {result && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <h3 style={{ 
              marginBottom: '1rem', 
              color: result.success ? '#22C55E' : '#EF4444' 
            }}>
              {result.success ? '✅ Test Result' : '❌ Test Failed'}
            </h3>
            
            {result.message && (
              <p style={{ 
                marginBottom: '1rem', 
                color: result.success ? '#22C55E' : '#EF4444',
                fontWeight: '600'
              }}>
                {result.message}
              </p>
            )}
            
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#EC4899', 
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                View Detailed Response
              </summary>
              <pre style={{ 
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.9rem',
                lineHeight: '1.4',
                color: '#ccc'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h4 style={{ color: '#EC4899', marginBottom: '0.5rem' }}>Next Steps:</h4>
          <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
            <li>If the test succeeds, try signing up with a new account</li>
            <li>If it fails, check your server logs for error details</li>
            <li>Make sure your SendGrid API key and template IDs are correct</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
