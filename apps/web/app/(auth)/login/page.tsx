'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Loading fallback component
function LoginLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          color: 'white'
        }}
      >
        <div>Loading...</div>
      </div>
    </div>
  );
}

// Main login content component that uses useSearchParams
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithProvider, signOut } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Persist form data in sessionStorage to survive re-renders after signOut
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = sessionStorage.getItem('login_email');
      const savedPassword = sessionStorage.getItem('login_password');
      if (savedEmail && savedPassword) {
        return { email: savedEmail, password: savedPassword };
      }
    }
    return { email: '', password: '' };
  });

  // Check for URL parameters for confirmation errors
  React.useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    
    if (urlError === 'confirmation_failed') {
      setError(urlMessage || 'Email confirmation failed. Please try again.');
    } else if (urlError === 'invalid_token') {
      setError('Invalid confirmation link. Please request a new confirmation email.');
    } else if (urlError === 'callback_failed') {
      setError('Confirmation process failed. Please try again.');
    }
  }, [searchParams]);

  // Restore form data from sessionStorage when component mounts or when not in 2FA mode
  React.useEffect(() => {
    if (!requires2FA && typeof window !== 'undefined') {
      const savedEmail = sessionStorage.getItem('login_email');
      const savedPassword = sessionStorage.getItem('login_password');
      if (savedEmail && savedPassword && (!formData.email || !formData.password)) {
        console.log('📝 Restoring form data from sessionStorage');
        setFormData({ email: savedEmail, password: savedPassword });
      }
    }
  }, [requires2FA]); // Only run when requires2FA changes

  // Persist 2FA state in sessionStorage to survive re-renders after signOut
  const [requires2FA, setRequires2FA] = useState(() => {
    if (typeof window !== 'undefined') {
      const persisted = sessionStorage.getItem('2fa_required');
      const token = sessionStorage.getItem('2fa_session_token');
      if (persisted === 'true' && token) {
        return true;
      }
    }
    return false;
  });
  const [twoFASessionToken, setTwoFASessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('2fa_session_token');
    }
    return null;
  });
  const [twoFACode, setTwoFACode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);

  // Sync 2FA state to sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (requires2FA && twoFASessionToken) {
        sessionStorage.setItem('2fa_required', 'true');
        sessionStorage.setItem('2fa_session_token', twoFASessionToken);
      } else {
        sessionStorage.removeItem('2fa_required');
        sessionStorage.removeItem('2fa_session_token');
      }
    }
  }, [requires2FA, twoFASessionToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await signIn(formData.email, formData.password);

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data?.user && data?.session) {
        // Give cookies time to be set
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if 2FA is required
        try {
          console.log('🔍 Checking if 2FA is required for user:', data.user.id);
          
          const check2FAResponse = await fetch('/api/user/2fa/check-required', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: data.user.id,
            }),
          });

          console.log('📊 2FA check response status:', check2FAResponse.status);
          
          if (!check2FAResponse.ok) {
            console.error('❌ 2FA check failed with status:', check2FAResponse.status);
            const errorData = await check2FAResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ Error response:', errorData);
            // Don't proceed with login if 2FA check fails - user might have 2FA enabled
            setError('Failed to verify 2FA status. Please try again.');
            setIsLoading(false);
            return;
          }
          
          const check2FAData = await check2FAResponse.json();
          console.log('📊 2FA check response data:', check2FAData);

          if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
            console.log('🔒 2FA is required - showing verification screen');
            console.log('📝 Session token:', check2FAData.data.sessionToken);
            
            // Save email/password to sessionStorage before signing out
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('login_email', formData.email);
              sessionStorage.setItem('login_password', formData.password);
            }
            
            // 2FA is required - show verification screen
            // IMPORTANT: Sign out from Supabase to prevent access without 2FA verification
            await signOut();
            console.log('🚪 Signed out from Supabase - awaiting 2FA verification');
            
            // Set state BEFORE setting loading to false to ensure UI updates
            setRequires2FA(true);
            setTwoFASessionToken(check2FAData.data.sessionToken);
            setError(null); // Clear any previous errors
            setIsLoading(false);
            
            console.log('✅ State updated - requires2FA:', true, 'sessionToken:', check2FAData.data.sessionToken ? 'present' : 'missing');
            return;
          } else {
            console.log('✅ 2FA not required or already verified');
            console.log('📊 Response:', check2FAData);
          }
        } catch (checkError) {
          console.error('❌ Error checking 2FA:', checkError);
          setError('Failed to check 2FA status. Please try again.');
          setIsLoading(false);
          return;
        }

        // No 2FA required - proceed with normal login
        const redirectTo = searchParams.get('redirectTo') || '/dashboard';
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError(null);
    setIsVerifying2FA(true);

    if (!twoFACode || twoFACode.length !== 6) {
      setTwoFAError('Please enter a 6-digit code');
      setIsVerifying2FA(false);
      return;
    }

    if (!twoFASessionToken) {
      setTwoFAError('Session expired. Please log in again.');
      setIsVerifying2FA(false);
      return;
    }

    try {
      const verifyResponse = await fetch('/api/user/2fa/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionToken: twoFASessionToken,
          code: twoFACode,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        // 2FA verified - now sign in again to get the session
        // The verification session is marked as verified, so login will proceed
        // Get email/password from sessionStorage if formData is empty (after re-render)
        const email = formData.email || (typeof window !== 'undefined' ? sessionStorage.getItem('login_email') : null) || '';
        const password = formData.password || (typeof window !== 'undefined' ? sessionStorage.getItem('login_password') : null) || '';
        
        if (!email || !password) {
          setTwoFAError('Email and password not found. Please log in again.');
          setIsVerifying2FA(false);
          return;
        }
        
        console.log('🔐 Signing in after 2FA verification with email:', email);
        const { data: signInData, error: signInError } = await signIn(email, password);
        
        if (signInError) {
          setTwoFAError('Verification successful but login failed. Please try again.');
          setIsVerifying2FA(false);
          return;
        }

        // Check 2FA again - this time it should see the verified session and allow login
        if (signInData?.user && signInData?.session) {
          try {
            const check2FAResponse = await fetch('/api/user/2fa/check-required', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${signInData.session.access_token}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                userId: signInData.user.id,
              }),
            });

            const check2FAData = await check2FAResponse.json();

            // If 2FA is still required, the session wasn't properly verified
            if (check2FAData.success && check2FAData.data?.twoFactorRequired) {
              setTwoFAError('Session verification failed. Please try again.');
              setIsVerifying2FA(false);
              return;
            }
          } catch (checkError) {
            console.error('Error re-checking 2FA:', checkError);
            // Continue anyway - verification was successful
          }

          // Clear sessionStorage after successful login
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('login_email');
            sessionStorage.removeItem('login_password');
            sessionStorage.removeItem('2fa_required');
            sessionStorage.removeItem('2fa_session_token');
          }
          
          // Give cookies time to be set
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const redirectTo = searchParams.get('redirectTo') || '/dashboard';
          window.location.href = redirectTo;
        } else {
          setTwoFAError('Login failed after verification. Please try again.');
        }
      } else {
        setTwoFAError(verifyData.error || 'Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setTwoFAError('An unexpected error occurred. Please try again.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithProvider(provider);
      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      {/* Back to Home */}
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          color: 'white',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '25px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      {/* Auth Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '3rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}
          >
            Welcome Back
          </h1>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>
            Sign in to your SoundBridge account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#FCA5A5',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* 2FA Verification Screen */}
        {requires2FA ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '0.5rem'
              }}>
                Two-Factor Authentication
              </h2>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {twoFAError && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#FCA5A5',
                fontSize: '0.9rem'
              }}>
                {twoFAError}
              </div>
            )}

            <form onSubmit={handle2FAVerification} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTwoFACode(value);
                    setTwoFAError(null);
                  }}
                  required
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    color: '#374151',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    letterSpacing: '0.5rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying2FA || twoFACode.length !== 6}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isVerifying2FA || twoFACode.length !== 6
                    ? 'rgba(220, 38, 38, 0.5)'
                    : 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isVerifying2FA || twoFACode.length !== 6 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isVerifying2FA || twoFACode.length !== 6 ? 0.6 : 1
                }}
              >
                {isVerifying2FA ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFASessionToken(null);
                  setTwoFACode('');
                  setTwoFAError(null);
                  // Clear sessionStorage
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('2fa_required');
                    sessionStorage.removeItem('2fa_session_token');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  color: '#999',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#999';
                }}
              >
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={20}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#374151',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#374151',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right' }}>
            <Link
              href="/reset-password"
              style={{
                color: '#EC4899',
                textDecoration: 'none',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#EC4899'}
            >
              Forgot your password?
            </Link>
          </div>

          {/* Submit Button - Fresh SoundBridge Themed */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)')}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        )}

        {/* Divider - Only show if not in 2FA mode */}
        {!requires2FA && (
          <>
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#6b7280' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '0.9rem' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
        </div>

        {/* Social Login - Google Only */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '0.75rem 2rem',
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              opacity: isLoading ? 0.6 : 1,
              transform: 'translateY(0)',
              minWidth: '200px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#f9fafb', e.currentTarget.style.borderColor = '#d1d5db', e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#ffffff', e.currentTarget.style.borderColor = '#e5e7eb', e.currentTarget.style.transform = 'translateY(0)')}
          >
            Google
          </button>
        </div>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            style={{
              color: '#EC4899',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#EC4899'}
          >
            Sign up
          </Link>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
} 