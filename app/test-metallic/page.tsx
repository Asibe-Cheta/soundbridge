'use client';

import React, { useState, useEffect } from 'react';
import SoundBridgeMetallicLogo from '../../src/components/ui/SoundBridgeMetallicLogo';

export default function TestMetallicPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Test if the logo file is accessible
    fetch('/images/logos/logo-trans-lockup.svg')
      .then(response => {
        if (response.ok) {
          console.log('✅ Logo SVG file is accessible');
          setIsLoaded(true);
        } else {
          console.error('❌ Logo SVG file not accessible:', response.status);
        }
      })
      .catch(error => {
        console.error('❌ Error loading logo SVG:', error);
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        Metallic Paint Test
      </h1>

      <div style={{
        width: '100%',
        maxWidth: '600px',
        height: '400px',
        marginBottom: '2rem'
      }}>
        <SoundBridgeMetallicLogo 
          style={{
            height: '100%',
            width: '100%'
          }}
          params={{
            edge: 2,
            patternBlur: 0.005,
            patternScale: 2,
            refraction: 0.015,
            speed: 0.3,
            liquid: 0.07
          }}
        />
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>
          Test Status
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
          {isLoaded ? '✅ Logo file loaded successfully' : '⏳ Loading logo file...'}
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
          If you can see the metallic animation above, the effect is working correctly!
        </p>
      </div>

      <div style={{
        marginTop: '2rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <a href="/about" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease'
          }}>
            View on About Page
          </button>
        </a>
        <a href="/metallic-demo" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'transparent',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease'
          }}>
            Interactive Demo
          </button>
        </a>
      </div>
    </div>
  );
}
