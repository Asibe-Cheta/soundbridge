'use client';

import React from 'react';
import { Footer } from '../../src/components/layout/Footer';
import { FileText, Calendar, User, ArrowRight, Tag, Clock, TrendingUp, Music, Users, Star } from 'lucide-react';

export default function BlogPage() {
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
              Blog
            </h1>
          </div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Stories, insights, and updates from the SoundBridge team. Discover the latest in music tech, 
            community features, and behind-the-scenes content.
          </p>
        </section>

        {/* Featured Post */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: 'white',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <TrendingUp size={24} style={{ color: '#DC2626' }} />
            Featured Post
          </h2>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
            border: '2px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <Calendar size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>March 20, 2024</span>
              <User size={16} style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '1rem' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Sarah Chen</span>
            </div>
            
            <h3 style={{
              fontSize: '1.8rem',
              color: 'white',
              marginBottom: '1rem',
              lineHeight: '1.3'
            }}>
              "How AI is Revolutionizing Music Discovery: The SoundBridge Approach"
            </h3>
            
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              Explore how we're using cutting-edge AI technology to create personalized music recommendations 
              that go beyond simple genre matching. Learn about our collaborative filtering algorithms and 
              how they're helping users discover their next favorite artist.
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <Tag size={16} style={{ color: '#DC2626' }} />
              <span style={{
                background: 'rgba(220, 38, 38, 0.2)',
                color: '#DC2626',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                AI & Machine Learning
              </span>
              <span style={{
                background: 'rgba(236, 72, 153, 0.2)',
                color: '#EC4899',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                Product Updates
              </span>
            </div>
            
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
              Read Full Article <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Blog Categories */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: 'white',
            marginBottom: '2rem'
          }}>
            Categories
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <Music size={32} style={{ color: '#DC2626', marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Music Tech</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: 0 }}>15 posts</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <Users size={32} style={{ color: '#EC4899', marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Community</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: 0 }}>12 posts</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <TrendingUp size={32} style={{ color: '#10B981', marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Product Updates</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: 0 }}>8 posts</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <Star size={32} style={{ color: '#F59E0B', marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Company News</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: 0 }}>6 posts</p>
            </div>
          </div>
        </section>

        {/* Recent Posts */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            color: 'white',
            marginBottom: '2rem'
          }}>
            Recent Posts
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {/* Post 1 */}
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
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>March 18, 2024</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '1rem' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>5 min read</span>
              </div>
              
              <h3 style={{
                fontSize: '1.3rem',
                color: 'white',
                marginBottom: '1rem',
                lineHeight: '1.3'
              }}>
                "Building a More Inclusive Music Community"
              </h3>
              
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Our commitment to diversity and inclusion in music discovery. 
                Learn about the initiatives we're implementing to ensure all voices are heard.
              </p>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#EC4899',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Community
                </span>
                <a href="#" style={{
                  color: '#DC2626',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  Read More <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Post 2 */}
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
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '1rem' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>8 min read</span>
              </div>
              
              <h3 style={{
                fontSize: '1.3rem',
                color: 'white',
                marginBottom: '1rem',
                lineHeight: '1.3'
              }}>
                "The Future of Live Music Events: Trends We're Watching"
              </h3>
              
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                From virtual reality concerts to sustainable venues, explore the trends 
                shaping the future of live music experiences.
              </p>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Music Tech
                </span>
                <a href="#" style={{
                  color: '#DC2626',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  Read More <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Post 3 */}
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
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>March 12, 2024</span>
                <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '1rem' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>6 min read</span>
              </div>
              
              <h3 style={{
                fontSize: '1.3rem',
                color: 'white',
                marginBottom: '1rem',
                lineHeight: '1.3'
              }}>
                "Behind the Scenes: Building SoundBridge's Recommendation Engine"
              </h3>
              
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                A technical deep-dive into the algorithms and data science behind 
                our music recommendation system.
              </p>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  background: 'rgba(220, 38, 38, 0.2)',
                  color: '#DC2626',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Product Updates
                </span>
                <a href="#" style={{
                  color: '#DC2626',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  Read More <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Signup */}
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
            Stay Updated
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            Subscribe to our newsletter for the latest blog posts, product updates, 
            and music industry insights delivered straight to your inbox.
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <button style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Subscribe
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


