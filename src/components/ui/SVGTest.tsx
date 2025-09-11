'use client';

import { useState, useEffect } from 'react';

export default function SVGTest() {
  const [svgContent, setSvgContent] = useState('');
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch('/images/logos/soundbridge-logo-main.svg');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const svgText = await response.text();
        setSvgContent(svgText);
        
        // Process for masking
        let processedSvg = svgText;
        processedSvg = processedSvg.replace(/fill="[^"]*"/g, 'fill="black"');
        if (!processedSvg.includes('fill=')) {
          processedSvg = processedSvg.replace(/<path/g, '<path fill="black"');
        }
        
        const base64 = btoa(processedSvg);
        const url = `data:image/svg+xml;base64,${base64}`;
        setDataUrl(url);
      } catch (err) {
        console.error('Error:', err);
      }
    };

    fetchSvg();
  }, []);

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h2>SVG Loading Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Original SVG Content:</h3>
        <pre style={{ background: '#333', padding: '10px', fontSize: '12px', overflow: 'auto' }}>
          {svgContent.substring(0, 500)}...
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Direct SVG Display:</h3>
        <div 
          style={{ background: 'white', padding: '20px', display: 'inline-block' }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>As Background Image:</h3>
        <div 
          style={{
            width: '200px',
            height: '200px',
            backgroundImage: `url(${dataUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            background: 'white',
            border: '2px solid red'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Metallic Effect Test:</h3>
        <div 
          style={{
            width: '300px',
            height: '300px',
            position: 'relative',
            backgroundColor: '#000',
            border: '2px solid yellow'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'linear-gradient(45deg, #4a4a4a, #ffffff, #8a8a8a)',
              maskImage: `url(${dataUrl})`,
              WebkitMaskImage: `url(${dataUrl})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center'
            }}
          />
        </div>
      </div>
    </div>
  );
}