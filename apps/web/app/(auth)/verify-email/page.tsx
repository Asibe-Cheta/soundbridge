'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function VerifyEmailPage() {
  const [email] = useState(() => {
    // Get email from URL params or localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('email') || localStorage.getItem('signup_email') || '';
    }
    return '';
  });

  const handleResendEmail = async () => {
    // TODO: Implement resend email functionality
    alert('Resend email functionality will be implemented here');
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
        ←
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
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}
      >
        {/* Logo */}
        <Link href="/" className="logo" style={{ textDecoration: 'none', display: 'block' }}>
                  <Image
                    src="/images/logos/logo-trans-lockup.png"
                    alt="SoundBridge Logo"
                    width={150}
                    height={40}
                    priority
                    style={{ height: 'auto' }}
                  />
                </Link>

        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          border: '2px solid rgba(34, 197, 94, 0.3)'
        }}>
          <span style={{ fontSize: '40px', color: '#22C55E' }}>✅</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
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
            Check Your Email
          </h1>
          <p style={{ color: '#ccc', fontSize: '1rem', lineHeight: '1.5' }}>
            We&apos;ve sent a verification link to your email address
          </p>
        </div>

        {/* Email Display */}
        {email && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '20px', color: '#EC4899' }}>✉️</span>
            <span style={{ color: 'white', fontWeight: '500' }}>{email}</span>
          </div>
        )}

        {/* Instructions */}
        <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
          <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>
            What to do next:
          </h3>
          <ul style={{ 
            color: '#ccc', 
            fontSize: '0.9rem', 
            lineHeight: '1.6',
            paddingLeft: '1.5rem'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Check your email inbox (and spam folder)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Click the verification link in the email
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Return to SoundBridge to complete your setup
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={handleResendEmail}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '1rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Resend Verification Email
          </button>
          
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button
              style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Back to Sign In
            </button>
          </Link>
        </div>

        {/* Help Text */}
        <div style={{ color: '#999', fontSize: '0.9rem', lineHeight: '1.4' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            Didn&apos;t receive the email? Check your spam folder or try a different email address.
          </p>
          <p>
            Need help?{' '}
            <Link href="/contact" style={{ color: '#EC4899', textDecoration: 'none' }}>
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 