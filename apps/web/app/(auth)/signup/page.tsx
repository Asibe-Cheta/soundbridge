'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Music, Headphones } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { createProfile, generateUsername } from '@/src/lib/profile';
import Image from 'next/image';

// Loading component for Suspense
function SignupLoading() {
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
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
      </div>
    </div>
  );
}

// Main signup content component that uses useSearchParams
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInWithProvider } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'creator' | 'listener'>('creator');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    terms: false,
    marketing: false,
  });

  // Beta access check - must run first before any other logic
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
    const hasBetaAccess = localStorage.getItem('beta_access') === 'granted';
    const code = searchParams.get('code');
    const validBetaCode = process.env.NEXT_PUBLIC_BETA_CODE;

    // If beta code is provided in URL, validate and grant access
    if (code && validBetaCode && code === validBetaCode) {
      localStorage.setItem('beta_access', 'granted');
      localStorage.setItem('beta_access_granted_at', new Date().toISOString());
      // Remove code from URL for cleaner URL (optional)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('code');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      return; // Allow signup to proceed
    }

    // Check if beta mode is active and user doesn't have access
    if (isBetaMode && !hasBetaAccess) {
      // No beta access - redirect to waitlist
      router.push('/waitlist');
      return;
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    // Validate role selection
    if (!selectedRole) {
      setError('Please select whether you are a Creator or Listener');
      setIsLoading(false);
      return;
    }

    try {
      // Generate username from email and name
      const username = generateUsername(formData.email, formData.firstName, formData.lastName);
      
      // Sign up with Supabase
      const { data, error: signUpError } = await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: selectedRole,
        location: formData.location,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Store signup data for profile creation after email verification
        if (typeof window !== 'undefined') {
          localStorage.setItem('signup_email', formData.email);
          localStorage.setItem('signup_profile_data', JSON.stringify({
            userId: data.user.id,
            username,
            display_name: `${formData.firstName} ${formData.lastName}`,
            role: selectedRole,
            location: formData.location,
            country: formData.location.includes('Nigeria') ? 'Nigeria' : 'UK',
            bio: '',
          }));
        }

        // Supabase will automatically send signup confirmation email via Auth hook
        // No need to manually send email - it's handled by the Auth hook

        // Redirect to dashboard or email confirmation page
        if (data.session) {
          // User is automatically signed in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // Email confirmation required - redirect to verification page
          router.push('/verify-email');
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
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
        display: 'flex',
        flexDirection: 'row',
        position: 'relative'
      }}
    >
      {/* Desktop Background Image - Right Side */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '50%',
          height: '100vh',
          backgroundImage: 'url(/images/backgrounds/bg-2.JPG)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
          display: 'none'
        }}
        className="desktop-bg"
      >
        {/* Overlay for better text readability */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.3) 0%, rgba(45, 27, 61, 0.4) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              Join SoundBridge
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '400px' }}>
              Connect with creators, discover amazing events, and be part of a vibrant music community
            </p>
          </div>
        </div>
      </div>

      {/* Form Container - Left Side */}
      <div 
        style={{
          width: '100%',
          minHeight: '100vh',
          background: 'var(--bg-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          position: 'relative',
          zIndex: 2
        }}
        className="form-container"
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
            transition: 'all 0.3s ease',
            zIndex: 10
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
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Logo - Centered */}
          <Link href="/" style={{ textAlign: 'center', marginBottom: '1rem', display: 'block', textDecoration: 'none' }}>
            <Image
              src="/images/logos/logo-trans-lockup.png"
              alt="SoundBridge Logo"
              width={150}
              height={40}
              priority
              style={{ height: 'auto' }}
            />
          </Link>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ color: '#ccc', fontSize: '1rem' }}>
              Connect with creators and discover amazing events
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#EC4899' }}>
                I want to join as a:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  style={{
                    background: selectedRole === 'creator' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedRole === 'creator' ? '2px solid #DC2626' : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '15px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSelectedRole('creator')}
                  onMouseEnter={(e) => selectedRole !== 'creator' && (e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)', e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)')}
                  onMouseLeave={(e) => selectedRole !== 'creator' && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)', e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <Music size={32} color={selectedRole === 'creator' ? '#DC2626' : '#EC4899'} />
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Creator</div>
                  <div style={{ fontSize: '0.9rem', color: '#999' }}>Share music, podcasts & host events</div>
                </div>
                <div
                  style={{
                    background: selectedRole === 'listener' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedRole === 'listener' ? '2px solid #DC2626' : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '15px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSelectedRole('listener')}
                  onMouseEnter={(e) => selectedRole !== 'listener' && (e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)', e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)')}
                  onMouseLeave={(e) => selectedRole !== 'listener' && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)', e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <Headphones size={32} color={selectedRole === 'listener' ? '#DC2626' : '#EC4899'} />
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Listener</div>
                  <div style={{ fontSize: '0.9rem', color: '#999' }}>Discover content & attend events</div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: '#374151',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: '#374151',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#374151',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Enter your email"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#374151',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Create a strong password"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#374151',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Confirm your password"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ccc' }}>
                Location
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#374151',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="" style={{ background: '#1a1a1a', color: 'white' }}>Select your location</option>
                <option value="london" style={{ background: '#1a1a1a', color: 'white' }}>London, UK</option>
                <option value="manchester" style={{ background: '#1a1a1a', color: 'white' }}>Manchester, UK</option>
                <option value="birmingham" style={{ background: '#1a1a1a', color: 'white' }}>Birmingham, UK</option>
                <option value="lagos" style={{ background: '#1a1a1a', color: 'white' }}>Lagos, Nigeria</option>
                <option value="abuja" style={{ background: '#1a1a1a', color: 'white' }}>Abuja, Nigeria</option>
                <option value="other-uk" style={{ background: '#1a1a1a', color: 'white' }}>Other UK</option>
                <option value="other-nigeria" style={{ background: '#1a1a1a', color: 'white' }}>Other Nigeria</option>
              </select>
            </div>

            {/* Terms and Conditions */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleInputChange}
                required
                style={{ marginTop: '0.25rem' }}
              />
              <label style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                I agree to SoundBridge&apos;s{' '}
                        <Link href="/legal/terms" style={{ color: '#EC4899', textDecoration: 'none' }}>
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/legal/privacy" style={{ color: '#EC4899', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input
                type="checkbox"
                name="marketing"
                checked={formData.marketing}
                onChange={handleInputChange}
                style={{ marginTop: '0.25rem' }}
              />
              <label style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                I&apos;d like to receive emails about new features, events, and creator spotlights
              </label>
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
                width: '100%',
                marginBottom: '1.5rem',
                opacity: isLoading ? 0.6 : 1,
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)')}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem',
                    display: 'inline-block'
                  }}></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
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

          {/* Sign In Link */}
          <div style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link 
              href="/login"
              style={{
                color: '#EC4899',
                textDecoration: 'none',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          /* Desktop styles */
          @media (min-width: 1024px) {
            .desktop-bg {
              display: block !important;
            }
            
            .form-container {
              width: 50% !important;
              margin-right: 50%;
            }
          }
          
          /* Mobile styles */
          @media (max-width: 1023px) {
            .desktop-bg {
              display: none !important;
            }
            
            .form-container {
              width: 100% !important;
              margin-right: 0;
            }
          }
          
          @media (max-width: 640px) {
            .signup-container {
              padding: 2rem;
            }
            
            .role-options {
              grid-template-columns: 1fr;
            }
            
            .form-row {
              grid-template-columns: 1fr;
            }
          }

          /* Dropdown styling for both themes */
          select option {
            background-color: #ffffff !important;
            color: #374151 !important;
            padding: 0.5rem;
          }

          select option:hover {
            background-color: #f3f4f6 !important;
          }

          select option:checked {
            background-color: #DC2626 !important;
            color: white !important;
          }

          /* Ensure dropdown is visible */
          select:focus option:checked {
            background-color: #DC2626 !important;
            color: white !important;
          }
        `
      }} />
    </div>
  );
} 