'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleMetallicTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Simple test page loaded');
    
    // Test WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      setWebglSupported(true);
      addLog('WebGL2/WebGL is supported');
    } else {
      setWebglSupported(false);
      addLog('WebGL is NOT supported');
    }

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
      <h1 style={{ marginBottom: '2rem', color: '#EC4899' }}>Simple Metallic Test</h1>
      
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>System Check:</h2>
        <div style={{ marginBottom: '1rem' }}>
          <strong>WebGL Support:</strong> 
          <span style={{ 
            color: webglSupported === true ? '#4ade80' : webglSupported === false ? '#ef4444' : '#fbbf24',
            marginLeft: '0.5rem'
          }}>
            {webglSupported === true ? '✅ Supported' : webglSupported === false ? '❌ Not Supported' : '⏳ Checking...'}
          </span>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>User Agent:</strong> 
          <span style={{ color: '#ccc', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
            {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side'}
          </span>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Debug Logs:</h2>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.5)', 
          padding: '1rem', 
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.9rem'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '0.5rem' }}>{log}</div>
          ))}
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Simple Canvas Test:</h2>
        <div style={{ 
          height: '200px',
          border: '2px solid #EC4899',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <canvas 
            id="test-canvas"
            style={{ 
              width: '100%', 
              height: '100%',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)'
            }}
          />
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '1rem', 
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Next Steps:</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/debug-metallic" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → Full Debug Page
          </a>
          <a href="/about" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → About Page
          </a>
          <a href="/test-metallic" style={{ color: '#EC4899', textDecoration: 'none' }}>
            → Test Metallic Page
          </a>
        </div>
      </div>
    </div>
  );
}
