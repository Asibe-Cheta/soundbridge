'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CreatorProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  console.log('🔥 Creator profile page loaded with username/ID:', username);

  // Handle mock creators
  if (username === 'testcreator1') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '600px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: '0 auto 2rem',
            color: 'white'
          }}>
            TC
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Test Creator 1
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#ccc',
            marginBottom: '2rem'
          }}>
            A talented music creator from London, UK
          </p>
          
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>150</div>
              <div style={{ color: '#999' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>8</div>
              <div style={{ color: '#999' }}>Tracks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>2</div>
              <div style={{ color: '#999' }}>Events</div>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ color: '#EC4899', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🎵 Electronic Music Creator
            </div>
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Hot Score: 75.5 • Recent Activity: High
            </div>
          </div>
          
          <Link href="/" style={{
            display: 'inline-block',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '25px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (username === 'testcreator2') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '600px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #EC4899, #F97316)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: '0 auto 2rem',
            color: 'white'
          }}>
            TC
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #EC4899, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Test Creator 2
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#ccc',
            marginBottom: '2rem'
          }}>
            Another amazing artist from New York, USA
          </p>
          
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>89</div>
              <div style={{ color: '#999' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>12</div>
              <div style={{ color: '#999' }}>Tracks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>1</div>
              <div style={{ color: '#999' }}>Events</div>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ color: '#EC4899', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🎤 Hip Hop Artist & Podcaster
            </div>
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Hot Score: 68.2 • Multi-format Creator
            </div>
          </div>
          
          <Link href="/" style={{
            display: 'inline-block',
            background: 'linear-gradient(45deg, #EC4899, #F97316)',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '25px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Handle the actual user ID case
  if (username === 'userbd8a455d' || username.includes('bd8a455d')) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '600px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: '0 auto 2rem',
            color: 'white'
          }}>
            YC
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Your Creator Profile
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: '#ccc',
            marginBottom: '2rem'
          }}>
            Welcome to your creator dashboard! This is your profile page.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>0</div>
              <div style={{ color: '#999' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>0</div>
              <div style={{ color: '#999' }}>Tracks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EC4899' }}>0</div>
              <div style={{ color: '#999' }}>Events</div>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ color: '#EC4899', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🎵 Your Music Journey Starts Here
            </div>
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Upload your first track, connect with fans, and build your audience!
            </div>
          </div>
          
          <Link href="/" style={{
            display: 'inline-block',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '25px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Handle unknown creators
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '600px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          fontWeight: 'bold',
          margin: '0 auto 2rem',
          color: 'white'
        }}>
          ?
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          color: '#EC4899'
        }}>
          Creator Not Found
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#ccc',
          marginBottom: '2rem'
        }}>
          The creator "{username}" could not be found.
        </p>
        
        <Link href="/" style={{
          display: 'inline-block',
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          color: 'white',
          padding: '0.75rem 2rem',
          borderRadius: '25px',
          textDecoration: 'none',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}