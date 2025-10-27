'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { Briefcase, Users, MapPin, Clock, ArrowRight, Heart, Zap, Globe, Code, Music, Sparkles, BarChart } from 'lucide-react';

export default function CareersPage() {
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
            <Briefcase size={48} style={{ color: '#DC2626' }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Careers
            </h1>
          </div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Join our mission to revolutionize how people discover and connect through music. 
            Be part of a team that's building the future of music communities.
          </p>
        </section>

        {/* Why Join Us */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Why Join SoundBridge?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Heart size={48} style={{ color: '#DC2626', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Mission-Driven</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Work on something meaningful that brings people together through their shared love of music.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Zap size={48} style={{ color: '#EC4899', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Fast-Paced Growth</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Be part of a rapidly growing startup with opportunities to make a real impact from day one.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <Globe size={48} style={{ color: '#10B981', marginBottom: '1rem' }} />
              <h3 style={{ color: 'white', marginBottom: '1rem' }}>Remote-First</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Work from anywhere in the world with flexible hours and a focus on results over hours.
              </p>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Open Positions
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Software Engineer */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <Code size={32} style={{ color: '#DC2626' }} />
                <h3 style={{ color: 'white', margin: 0 }}>Senior Software Engineer</h3>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Remote</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Full-time</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Build scalable backend systems and intuitive user interfaces for our music discovery platform.
              </p>
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
                Apply Now <ArrowRight size={16} />
              </button>
            </div>

            {/* Product Designer */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <Sparkles size={32} style={{ color: '#EC4899' }} />
                <h3 style={{ color: 'white', margin: 0 }}>Product Designer</h3>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Remote</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Full-time</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Design beautiful, intuitive experiences that help users discover and share music.
              </p>
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
                Apply Now <ArrowRight size={16} />
              </button>
            </div>

            {/* Data Scientist */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <BarChart size={32} style={{ color: '#10B981' }} />
                <h3 style={{ color: 'white', margin: 0 }}>Data Scientist</h3>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Remote</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Full-time</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Build recommendation systems and analyze user behavior to improve music discovery.
              </p>
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
                Apply Now <ArrowRight size={16} />
              </button>
            </div>

            {/* Music Curator */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <Music size={32} style={{ color: '#F59E0B' }} />
                <h3 style={{ color: 'white', margin: 0 }}>Music Curator</h3>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Remote</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Part-time</span>
              </div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Discover and curate amazing music content to help users find their next favorite artist.
              </p>
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
                Apply Now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Benefits & Perks
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Competitive Salary</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Above-market compensation with equity options
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Health & Wellness</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Comprehensive health, dental, and vision coverage
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Flexible Time Off</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Unlimited PTO and paid holidays
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Learning Budget</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                $2,000 annual learning and development budget
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Home Office Setup</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                $1,500 stipend for home office equipment
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Music Perks</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Free concert tickets and music streaming subscriptions
              </p>
            </div>
          </div>
        </section>

        {/* Application Process */}
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
            Ready to Join Our Team?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            We're always looking for talented, passionate individuals who want to make a difference 
            in the music industry. Even if you don't see a perfect match, we'd love to hear from you.
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
            View All Openings
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}


