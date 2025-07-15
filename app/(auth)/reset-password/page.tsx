'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsEmailSent(true);
    }, 2000);
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
        {!isEmailSent ? (
          <>
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
                Reset Password
              </h1>
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            {/* Back to Login */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link 
                href="/login"
                style={{
                  color: '#EC4899',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#EC4899'}
              >
                ← Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <CheckCircle 
                  size={64} 
                  style={{ 
                    color: '#10B981',
                    margin: '0 auto 1rem'
                  }} 
                />
              </div>
              
              <h1 
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '0.5rem'
                }}
              >
                Check Your Email
              </h1>
              
              <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
                We've sent a password reset link to:
              </p>
              
              <p style={{ 
                color: '#EC4899', 
                fontSize: '1rem', 
                fontWeight: '600',
                background: 'rgba(236, 72, 153, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '2rem'
              }}>
                {email}
              </p>
              
              <p style={{ color: '#999', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Click the link in the email to reset your password. 
                If you don't see the email, check your spam folder.
              </p>
              
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => setIsEmailSent(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  Resend Email
                </button>
                
                <Link 
                  href="/login"
                  style={{
                    color: '#EC4899',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#EC4899'}
                >
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 