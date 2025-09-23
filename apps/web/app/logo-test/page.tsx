'use client';

import { useState, useEffect } from 'react';

export default function LogoTest() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testImageLoad() {
      try {
        console.log('Testing image load...');
        const response = await fetch('/images/logos/soundbridge-logo-main.png');
        console.log('Response:', response);
        
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('Blob created:', blob);
        
        const img = new Image();
        img.onload = () => {
          console.log('Image loaded successfully:', img.width, 'x', img.height);
          setImageLoaded(true);
        };
        img.onerror = () => {
          console.error('Image failed to load');
          setError('Image failed to load');
        };
        img.src = URL.createObjectURL(blob);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    testImageLoad();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Logo Load Test</h1>
      <p>Image loaded: {imageLoaded ? 'Yes' : 'No'}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <div style={{ border: '2px solid blue', padding: '1rem', margin: '1rem 0' }}>
        <img 
          src="/images/logos/soundbridge-logo-main.png" 
          alt="SoundBridge Logo"
          style={{ maxWidth: '200px', border: '1px solid red' }}
          onLoad={() => console.log('Direct img tag loaded')}
          onError={() => console.log('Direct img tag failed')}
        />
      </div>
    </div>
  );
}
