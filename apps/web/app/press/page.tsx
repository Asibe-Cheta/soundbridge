'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { FileText, Download, Mail, Phone, Calendar, Image as ImageIcon, Video } from 'lucide-react';

export default function PressPage() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {/* Main Content */}
      <main style={{
        padding: '2rem',
        paddingBottom: '7rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Hero Section */}
        <section style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <FileText size={48} style={{ color: '#DC2626' }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Press
            </h1>
          </div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Press resources, media kit, and contact information for journalists and media professionals covering SoundBridge.
          </p>
        </section>

        {/* Press Contact */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Press Contact
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              marginBottom: '2rem'
            }}>
              <div>
                <Mail size={32} style={{ color: '#DC2626', marginBottom: '1rem' }} />
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Email</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>press@soundbridge.live</p>
              </div>
              
              <div>
                <Phone size={32} style={{ color: '#EC4899', marginBottom: '1rem' }} />
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Phone</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>+1 (555) 123-4567</p>
              </div>
            </div>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              For press inquiries, interview requests, or media partnerships, please contact our press team. 
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </section>

        {/* Media Kit */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Media Kit
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Brand Assets */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <ImageIcon size={32} style={{ color: '#DC2626', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Brand Assets</h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                <li>High-resolution logos (PNG, SVG)</li>
                <li>Brand guidelines and color palette</li>
                <li>App screenshots and mockups</li>
                <li>Team photos and headshots</li>
              </ul>
              <button style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Download size={16} />
                Download Assets
              </button>
            </div>

            {/* Press Releases */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <FileText size={32} style={{ color: '#EC4899', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Press Releases</h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                <li>Latest company announcements</li>
                <li>Product launch releases</li>
                <li>Partnership announcements</li>
                <li>Company milestones and achievements</li>
              </ul>
              <button style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Download size={16} />
                Download Releases
              </button>
            </div>

            {/* Video Content */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <Video size={32} style={{ color: '#10B981', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Video Content</h3>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                <li>Product demo videos</li>
                <li>Company introduction videos</li>
                <li>Founder interviews</li>
                <li>User testimonials</li>
              </ul>
              <button style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Download size={16} />
                Download Videos
              </button>
            </div>
          </div>
        </section>

        {/* Recent Coverage */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Recent Press Coverage
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <Calendar size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>March 15, 2024</span>
              </div>
              <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.2rem' }}>
                "SoundBridge Revolutionizes Music Discovery with AI-Powered Recommendations"
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginBottom: '1rem' }}>
                TechCrunch covers our latest AI breakthrough in personalized music discovery...
              </p>
              <a href="#" style={{
                color: '#DC2626',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Read Full Article →
              </a>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <Calendar size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>March 8, 2024</span>
              </div>
              <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.2rem' }}>
                "Startup Spotlight: SoundBridge's Mission to Connect Music Lovers"
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginBottom: '1rem' }}>
                Forbes profiles our founder and the vision behind SoundBridge's community-driven approach...
              </p>
              <a href="#" style={{
                color: '#DC2626',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Read Full Article →
              </a>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <Calendar size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>February 28, 2024</span>
              </div>
              <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.2rem' }}>
                "Music Tech Roundup: SoundBridge Leads Innovation in Social Discovery"
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginBottom: '1rem' }}>
                Music Business Worldwide highlights our unique approach to social music discovery...
              </p>
              <a href="#" style={{
                color: '#DC2626',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Read Full Article →
              </a>
            </div>
          </div>
        </section>

        {/* Company Information */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Company Information
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              <div>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>About SoundBridge</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                  SoundBridge is a social music discovery platform that connects music lovers, 
                  creators, and event organizers. Founded in 2023, we're building the future 
                  of how people discover and share music.
                </p>
              </div>
              
              <div>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>Key Facts</h3>
                <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8' }}>
                  <li>Founded: 2023</li>
                  <li>Headquarters: San Francisco, CA</li>
                  <li>Employees: 25+</li>
                  <li>Users: 50,000+</li>
                  <li>Funding: $5M Series A</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Media Inquiries */}
        <section style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '16px',
          padding: '3rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Media Inquiries
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            For interviews, exclusive stories, or partnership opportunities, 
            our press team is ready to help. We can provide expert commentary 
            on music tech trends, startup insights, and industry analysis.
          </p>
          <button style={{
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Contact Press Team
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}


