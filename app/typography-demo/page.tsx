'use client';

import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function TypographyDemoPage() {
  const { theme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Page Title */}
        <h1 className="heading-1 text-display" style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>
          Apple Music Typography System
        </h1>
        
        <p className="text-large text-body" style={{ marginBottom: '3rem', color: 'var(--text-secondary)' }}>
          This page demonstrates the Apple Music typography system implemented in SoundBridge, featuring SF Pro Display for headings and SF Pro Text for body content.
        </p>

        {/* Typography Scale */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Typography Scale
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h1 className="heading-1 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 1 - SF Pro Display Bold
              </h1>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 700 | Size: 3rem (48px) | Line Height: 1.25
              </p>
            </div>
            
            <div>
              <h2 className="heading-2 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 2 - SF Pro Display Bold
              </h2>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 700 | Size: 2.25rem (36px) | Line Height: 1.25
              </p>
            </div>
            
            <div>
              <h3 className="heading-3 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 3 - SF Pro Display Semibold
              </h3>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 600 | Size: 1.875rem (30px) | Line Height: 1.375
              </p>
            </div>
            
            <div>
              <h4 className="heading-4 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 4 - SF Pro Display Semibold
              </h4>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 600 | Size: 1.5rem (24px) | Line Height: 1.375
              </p>
            </div>
            
            <div>
              <h5 className="heading-5 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 5 - SF Pro Display Semibold
              </h5>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 600 | Size: 1.25rem (20px) | Line Height: 1.375
              </p>
            </div>
            
            <div>
              <h6 className="heading-6 text-display" style={{ color: 'var(--text-primary)' }}>
                Heading 6 - SF Pro Display Semibold
              </h6>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Display | Weight: 600 | Size: 1.125rem (18px) | Line Height: 1.375
              </p>
            </div>
          </div>
        </section>

        {/* Body Text Styles */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Body Text Styles
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p className="text-large text-body" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Large Body Text - SF Pro Text Regular
              </p>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Text | Weight: 400 | Size: 1.125rem (18px) | Line Height: 1.625
              </p>
            </div>
            
            <div>
              <p className="text-base text-body" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Base Body Text - SF Pro Text Regular. This is the standard body text used throughout the application for main content, descriptions, and general reading material.
              </p>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Text | Weight: 400 | Size: 1rem (16px) | Line Height: 1.5
              </p>
            </div>
            
            <div>
              <p className="text-small text-body" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Small Body Text - SF Pro Text Regular
              </p>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Text | Weight: 400 | Size: 0.875rem (14px) | Line Height: 1.5
              </p>
            </div>
            
            <div>
              <p className="text-caption text-body" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Caption Text - SF Pro Text Regular
              </p>
              <p className="text-caption text-body" style={{ color: 'var(--text-secondary)' }}>
                Font: SF Pro Text | Weight: 400 | Size: 0.75rem (12px) | Line Height: 1.5 | Letter Spacing: 0.025em
              </p>
            </div>
          </div>
        </section>

        {/* Emphasis Styles */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Emphasis Styles
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-base text-body" style={{ color: 'var(--text-primary)' }}>
              Regular text with <span className="text-emphasis">medium emphasis</span> and <span className="text-strong">semibold emphasis</span> and <span className="text-bold">bold emphasis</span>.
            </p>
            
            <p className="text-base text-body" style={{ color: 'var(--text-primary)' }}>
              <span className="text-emphasis">Medium weight (500)</span> is used for subtle emphasis, <span className="text-strong">semibold (600)</span> for stronger emphasis, and <span className="text-bold">bold (700)</span> for maximum emphasis.
            </p>
          </div>
        </section>

        {/* Navigation Example */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Navigation Example
          </h2>
          
          <nav style={{ 
            display: 'flex', 
            gap: '2rem', 
            padding: '1rem', 
            background: 'var(--bg-secondary)', 
            borderRadius: '12px',
            border: '1px solid var(--border-primary)'
          }}>
            <a href="#" className="text-base text-display font-medium" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}>
              For You
            </a>
            <a href="#" className="text-base text-display font-medium" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}>
              Discover
            </a>
            <a href="#" className="text-base text-display font-medium" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}>
              Events
            </a>
            <a href="#" className="text-base text-display font-medium" style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}>
              Creators
            </a>
          </nav>
        </section>

        {/* Music Content Example */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Music Content Example
          </h2>
          
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '16px', 
            padding: '2rem',
            border: '1px solid var(--border-primary)'
          }}>
            <h4 className="heading-4 text-display" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Midnight City
            </h4>
            <p className="text-base text-body" style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              M83 • Hurry Up, We're Dreaming
            </p>
            <p className="text-small text-body" style={{ color: 'var(--text-secondary)' }}>
              Released in 2011, this synth-pop masterpiece captures the essence of urban nightlife with its ethereal vocals and driving electronic beats.
            </p>
          </div>
        </section>

        {/* Current Theme */}
        <section>
          <h2 className="heading-3 text-display" style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Current Theme
          </h2>
          <p className="text-base text-body" style={{ color: 'var(--text-secondary)' }}>
            Current theme: <span className="text-emphasis">{theme}</span>
          </p>
        </section>
      </div>
    </div>
  );
}
