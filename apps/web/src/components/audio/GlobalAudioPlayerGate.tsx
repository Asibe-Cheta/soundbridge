'use client';

import { usePathname } from 'next/navigation';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';

/** Skip site chrome on dedicated marketing surfaces */
export function GlobalAudioPlayerGate() {
  const pathname = usePathname();
  if (pathname === '/app') {
    return null;
  }
  return <GlobalAudioPlayer />;
}
