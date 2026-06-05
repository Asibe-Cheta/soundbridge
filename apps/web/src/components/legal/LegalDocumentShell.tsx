'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type LegalDocumentShellProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

const sectionHeadingStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '1rem',
  borderBottom: '2px solid var(--accent-primary)',
  paddingBottom: '0.5rem',
};

const bodyStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  marginBottom: '1rem',
};

export function LegalDocumentShell({ title, lastUpdated, children }: LegalDocumentShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        color: 'var(--text-primary)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'var(--card-bg)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: 'var(--card-shadow)',
          border: 'var(--card-border)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '25px',
            border: '2px solid var(--border-color)',
            transition: 'all 0.3s ease',
            marginBottom: '2rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontWeight: 'bold',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
            }}
          >
            {title}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Last updated: {lastUpdated}</p>
        </div>

        <div style={{ lineHeight: '1.8' }}>{children}</div>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              border: '2px solid var(--accent-primary)',
              borderRadius: '25px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.3s ease',
              background: 'var(--accent-primary)',
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={sectionHeadingStyle}>{title}</h2>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p style={bodyStyle}>{children}</p>;
}
