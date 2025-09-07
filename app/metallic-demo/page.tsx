'use client';

import React from 'react';
import Link from 'next/link';
import SoundBridgeMetallicLogo from '../../src/components/ui/SoundBridgeMetallicLogo';
import { ArrowLeft, Settings } from 'lucide-react';

export default function MetallicDemoPage() {
  const [params, setParams] = React.useState({
    edge: 2,
    patternBlur: 0.005,
    patternScale: 2,
    refraction: 0.015,
    speed: 0.3,
    liquid: 0.07
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem'
      }}>
        <Link href="/about" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <ArrowLeft size={16} />
            Back to About
          </button>
        </Link>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          Metallic Logo Demo
        </h1>
      </div>

      {/* Demo Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Logo Display */}
        <div style={{
          height: '600px',
          position: 'relative'
        }}>
          <SoundBridgeMetallicLogo 
            style={{
              height: '100%',
              width: '100%'
            }}
            params={params}
          />
        </div>

        {/* Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            color: '#EC4899'
          }}>
            <Settings size={20} />
            Animation Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Speed: {params.speed}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={params.speed}
                onChange={(e) => setParams(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Pattern Scale: {params.patternScale}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={params.patternScale}
                onChange={(e) => setParams(prev => ({ ...prev, patternScale: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Refraction: {params.refraction}
              </label>
              <input
                type="range"
                min="0.005"
                max="0.05"
                step="0.005"
                value={params.refraction}
                onChange={(e) => setParams(prev => ({ ...prev, refraction: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Liquid: {params.liquid}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.01"
                value={params.liquid}
                onChange={(e) => setParams(prev => ({ ...prev, liquid: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Edge: {params.edge}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={params.edge}
                onChange={(e) => setParams(prev => ({ ...prev, edge: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={() => setParams({
                edge: 2,
                patternBlur: 0.005,
                patternScale: 2,
                refraction: 0.015,
                speed: 0.3,
                liquid: 0.07
              })}
              style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                marginTop: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div style={{
        maxWidth: '800px',
        margin: '3rem auto 0',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        <h3 style={{ color: '#EC4899', marginBottom: '1rem' }}>
          Metallic Paint Effect
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
          This metallic paint animation creates a stunning, iridescent effect on your SoundBridge logo. 
          The effect uses advanced canvas rendering to simulate liquid metal with dynamic reflections 
          and refractions. Perfect for creating a premium, high-tech brand experience.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <Link href="/about" style={{ textDecoration: 'none' }}>
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
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              View on About Page
            </button>
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
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
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              Go to Homepage
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
