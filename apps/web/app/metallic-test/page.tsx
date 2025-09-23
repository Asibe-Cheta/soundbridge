'use client';

import { useEffect, useRef } from 'react';

export default function MetallicTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    console.log('WebGL2 context created successfully');

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.width = '400px';
    canvas.style.height = '400px';

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear with a color
    gl.clearColor(0.2, 0.3, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    console.log('Canvas should be visible with blue background');
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Metallic Paint Test</h1>
      <div style={{ border: '2px solid red', display: 'inline-block' }}>
        <canvas 
          ref={canvasRef}
          style={{ 
            border: '1px solid green',
            display: 'block'
          }}
        />
      </div>
      <p>If you see a blue square above, WebGL is working.</p>
    </div>
  );
}
