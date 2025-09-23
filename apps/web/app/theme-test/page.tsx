'use client';

import React from 'react';
import { Header } from '../../src/components/layout/Header';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Footer } from '../../src/components/layout/Footer';

export default function ThemeTestPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <Header />
      
      <main className="main-container">
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            marginBottom: '2rem',
            color: 'var(--text-primary)'
          }}>
            Theme Test Page
          </h1>
          
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid var(--border-primary)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '1rem' 
            }}>
              Current Theme: {theme}
            </h2>
            
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '2rem' 
            }}>
              This page demonstrates the theme system. The current theme is: <strong>{theme}</strong>
            </p>
            
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                marginBottom: '2rem'
              }}
            >
              Toggle Theme (Current: {theme})
            </button>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
              }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Card 1</h3>
                <p style={{ color: 'var(--text-secondary)' }}>This is a themed card</p>
              </div>
              
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid var(--border-secondary)'
              }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Card 2</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Another themed card</p>
              </div>
              
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
              }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Card 3</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Yet another themed card</p>
              </div>
            </div>
            
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '1.5rem', 
              borderRadius: '12px',
              border: '1px solid var(--border-primary)'
            }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Form Elements</h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Text input"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                />
                
                <textarea
                  placeholder="Textarea"
                  rows={3}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
                
                <select
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid var(--border-primary)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Theme Variables</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem',
              fontSize: '0.9rem'
            }}>
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Background Colors</h4>
                <div style={{ color: 'var(--text-secondary)' }}>
                  <div>Primary: var(--bg-primary)</div>
                  <div>Secondary: var(--bg-secondary)</div>
                  <div>Tertiary: var(--bg-tertiary)</div>
                  <div>Card: var(--bg-card)</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Text Colors</h4>
                <div style={{ color: 'var(--text-secondary)' }}>
                  <div>Primary: var(--text-primary)</div>
                  <div>Secondary: var(--text-secondary)</div>
                  <div>Muted: var(--text-muted)</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Accent Colors</h4>
                <div style={{ color: 'var(--text-secondary)' }}>
                  <div>Primary: var(--accent-primary)</div>
                  <div>Secondary: var(--accent-secondary)</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Borders</h4>
                <div style={{ color: 'var(--text-secondary)' }}>
                  <div>Primary: var(--border-primary)</div>
                  <div>Secondary: var(--border-secondary)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
