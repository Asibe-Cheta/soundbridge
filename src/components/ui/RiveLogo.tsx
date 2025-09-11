'use client';

import React from 'react';
import { useRive } from '@rive-app/react-canvas';

interface RiveLogoProps {
  className?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
}

export default function RiveLogo({ 
  className = '',
  width = 500,
  height = 500,
  autoplay = true
}: RiveLogoProps) {
  const { RiveComponent } = useRive({
    src: '/animations/soundbridge-logo.riv', // Update this path to match your .riv file
    autoplay,
    stateMachines: 'State Machine 1', // Update this to match your Rive file's state machine name
  });

  // If you have any boolean inputs in your Rive file, you can control them like this:
  // const booleanInput = useStateMachineInput(rive, 'State Machine 1', 'booleanInputName');

  return (
    <div className={`rive-logo-container ${className}`} style={{ 
      width, 
      height,
      backgroundColor: 'var(--bg-primary)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <RiveComponent 
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
}
