'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { parseTextWithUrls, formatUrlForDisplay } from '@/src/lib/link-utils';

interface LinkTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

/**
 * Component that renders text with clickable links
 */
export function LinkText({ text, className = '', linkClassName = '' }: LinkTextProps) {
  if (!text) return null;

  const segments = parseTextWithUrls(text);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.isUrl && segment.url) {
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-red-400 hover:text-red-300 underline inline-flex items-center gap-1 transition-colors ${linkClassName}`}
              onClick={(e) => {
                // Prevent navigation if clicking on a link within a post card that has its own click handler
                e.stopPropagation();
              }}
            >
              {formatUrlForDisplay(segment.text)}
              <ExternalLink size={12} className="inline" />
            </a>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </span>
  );
}

