'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'creator' | 'listener'>('listener');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    location: '',
    terms: false,
    marketing: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert('Account created successfully! (This is just a demo)');
    }, 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSocialLogin = (provider: string) => {
    alert(`${provider} login would be implemented here`);
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
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Logo */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.5rem', 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#DC2626', 
          marginBottom: '2rem' 
        }}>
          🌉 SoundBridge
        </div>

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
            Join SoundBridge
          </h1>
          <p style={{ color: '#ccc', fontSize: '1rem' }}>
            Connect with creators and discover amazing events
          </p>
        </div>

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
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
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
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎧</div>
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
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
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
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
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
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                color: 'white',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#DC2626'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
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
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                color: 'white',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#DC2626'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              placeholder="Create a strong password"
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
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                color: 'white',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#DC2626'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
            >
              <option value="">Select your location</option>
              <option value="london">London, UK</option>
              <option value="manchester">Manchester, UK</option>
              <option value="birmingham">Birmingham, UK</option>
              <option value="lagos">Lagos, Nigeria</option>
              <option value="abuja">Abuja, Nigeria</option>
              <option value="other-uk">Other UK</option>
              <option value="other-nigeria">Other Nigeria</option>
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
              I agree to SoundBridge's{' '}
              <Link href="/terms" style={{ color: '#EC4899', textDecoration: 'none' }}>
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: '#EC4899', textDecoration: 'none' }}>
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
              I'd like to receive emails about new features, events, and creator spotlights
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              width: '100%',
              marginBottom: '1.5rem',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 38, 38, 0.4)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'none')}
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
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#999' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '0.9rem' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
        </div>

        {/* Social Login */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => handleSocialLogin('google')}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Google
          </button>
          <button
            onClick={() => handleSocialLogin('facebook')}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Facebook
          </button>
          <button
            onClick={() => handleSocialLogin('apple')}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Apple
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

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
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
      `}</style>
    </div>
  );
} 