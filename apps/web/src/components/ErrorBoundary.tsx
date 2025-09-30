'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ marginBottom: '1rem', color: '#DC2626' }}>Something went wrong</h1>
            <p style={{ marginBottom: '1rem', color: '#ccc' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={this.resetError}
              style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid #DC2626',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
