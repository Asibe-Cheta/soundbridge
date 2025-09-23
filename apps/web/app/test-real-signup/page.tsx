'use client';

import { useState } from 'react';

export default function TestRealSignupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestSignup = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-real-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{ 
          color: '#EC4899', 
          marginBottom: '1rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Test Real Signup Flow
        </h1>
        
        <p style={{ 
          color: '#ccc', 
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          This will create a real Supabase user account and send a real confirmation email. 
          The confirmation link will work properly because it uses real Supabase tokens.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: '#EC4899',
            fontWeight: '500'
          }}>
            Email Address:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '1rem'
            }}
          />
        </div>

        <button
          onClick={handleTestSignup}
          disabled={loading}
          style={{
            background: loading ? '#666' : 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            width: '100%',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
            }
          }}
        >
          {loading ? 'Creating Account...' : 'Test Real Signup'}
        </button>

        {result && (
          <div style={{ 
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }}>
            <h3 style={{ 
              color: result.success ? '#22C55E' : '#EF4444',
              marginBottom: '1rem',
              fontSize: '1.1rem'
            }}>
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            
            <p style={{ 
              color: result.success ? '#22C55E' : '#EF4444',
              marginBottom: '1rem'
            }}>
              {result.message || result.error}
            </p>

            {result.details && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: '#EC4899',
                  fontWeight: '500'
                }}>
                  View Details
                </summary>
                <pre style={{ 
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  marginTop: '0.5rem'
                }}>
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(236, 72, 153, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(236, 72, 153, 0.3)'
        }}>
          <h4 style={{ color: '#EC4899', marginBottom: '0.5rem' }}>
            What This Test Does:
          </h4>
          <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
            <li>Creates a real Supabase user account</li>
            <li>Triggers the auth hook to send a real confirmation email</li>
            <li>Uses real Supabase tokens (not fake test tokens)</li>
            <li>The confirmation link will work properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
