'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, MessageSquare, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate form submission (replace with actual email service)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Back to Home */}
        <Link 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '25px',
            border: '2px solid var(--border-color)',
            transition: 'all 0.3s ease',
            marginBottom: '2rem'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1rem'
          }}>
            Get in Touch
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '1.2rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Have questions, feedback, or need support? We'd love to hear from you. 
            Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'start'
        }}>
          {/* Contact Information */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            padding: '2.5rem',
            boxShadow: 'var(--card-shadow)',
            border: 'var(--card-border)'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '2rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              Contact Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Mail size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Email
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    contact@soundbridge.live
                  </p>
                </div>
              </div>

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MapPin size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Address
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Wokingham, United Kingdom
                  </p>
                </div>
              </div>

              {/* Support */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Support
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    We typically respond within 24 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'var(--hover-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem'
              }}>
                Business Hours
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Monday - Friday: 9:00 AM - 6:00 PM GMT<br/>
                Weekend: Limited support available
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            padding: '2.5rem',
            boxShadow: 'var(--card-shadow)',
            border: 'var(--card-border)'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '2rem',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '0.5rem'
            }}>
              Send us a Message
            </h2>

            {submitStatus === 'success' && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#22C55E',
                fontSize: '0.9rem'
              }}>
                Thank you! Your message has been sent successfully. We'll get back to you soon.
              </div>
            )}

            {submitStatus === 'error' && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#FCA5A5',
                fontSize: '0.9rem'
              }}>
                Sorry, there was an error sending your message. Please try again.
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Name */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="Your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="What's this about?"
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2rem',
                  background: 'var(--accent-primary)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.7 : 1
                }}
                onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

             <style dangerouslySetInnerHTML={{
         __html: `
           @keyframes spin {
             from { transform: rotate(0deg); }
             to { transform: rotate(360deg); }
           }
         `
       }} />
    </div>
  );
}
