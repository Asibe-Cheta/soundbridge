'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithProvider } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

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

      if (data?.user) {
        // Redirect to the intended page or dashboard
        const redirectTo = searchParams.get('redirectTo') || '/dashboard';
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
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

        {/* Form */}
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
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
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
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '1rem',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 38, 38, 0.4)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'none')}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '2rem 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', position: 'absolute', top: '50%', left: 0, right: 0 }}></div>
          <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0 1rem', color: '#999', fontSize: '0.9rem' }}>
            or continue with
          </span>
        </div>

        {/* Social Login */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            Google
          </button>
          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            Facebook
          </button>
          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            Apple
          </button>
        </div>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
          Don't have an account?{' '}
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
      </div>
    </div>
  );
} 