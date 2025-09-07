'use client';

import React, { useState, useEffect } from 'react';
import SoundBridgeMetallicLogo from '../../src/components/ui/SoundBridgeMetallicLogo';

export default function DebugMetallicPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Debug page loaded');
    
    // Test logo file accessibility
    fetch('/images/logo-trans-lockup.svg')
      .then(response => {
        addLog(`Logo fetch response: ${response.status} ${response.statusText}`);
        return response.blob();
      })
      .then(blob => {
        addLog(`Logo blob loaded: ${blob.size} bytes, type: ${blob.type}`);
      })
      .catch(error => {
        addLog(`Logo fetch error: ${error.message}`);
      });
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <h1 style={{ marginBottom: '2rem', color: '#EC4899' }}>Metallic Logo Debug</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Debug Logs:</h2>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.5)', 
            padding: '1rem', 
            borderRadius: '8px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>{log}</div>
            ))}
          </div>
        </div>
        
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Metallic Logo Test:</h2>
          <div style={{ 
            height: '400px',
            border: '2px solid #EC4899',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <SoundBridgeMetallicLogo 
              style={{ height: '100%', width: '100%' }}
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
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Test Links:</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/about" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → About Page
          </a>
          <a href="/test-metallic" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → Test Metallic Page
          </a>
          <a href="/metallic-demo" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → Metallic Demo Page
          </a>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Browser Console Check:</h3>
        <p style={{ color: '#ccc', marginBottom: '1rem' }}>
          Open your browser's developer tools (F12) and check the Console tab for any errors.
        </p>
        <p style={{ color: '#ccc' }}>
          Look for errors related to WebGL, shaders, or image loading.
        </p>
      </div>
    </div>
  );
}
