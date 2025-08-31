'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Facebook, Youtube, Instagram, Twitter, MessageCircle, Check, X } from 'lucide-react';

interface SocialConnection {
  platform: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  isConnected: boolean;
  isAvailable: boolean;
  description: string;
}

export default function SocialConnectionsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<SocialConnection[]>([
    {
      platform: 'facebook',
      name: 'Facebook',
      icon: <Facebook size={24} />,
      color: '#1877F2',
      isConnected: false,
      isAvailable: true,
      description: 'Share tracks directly to your Facebook timeline'
    },
    {
      platform: 'youtube',
      name: 'YouTube',
      icon: <Youtube size={24} />,
      color: '#FF0000',
      isConnected: false,
      isAvailable: true,
      description: 'Share tracks to YouTube Studio and create Shorts'
    },
    {
      platform: 'instagram',
      name: 'Instagram',
      icon: <Instagram size={24} />,
      color: '#E4405F',
      isConnected: false,
      isAvailable: false,
      description: 'Instagram API is limited to business accounts only'
    },
    {
      platform: 'twitter',
      name: 'Twitter',
      icon: <Twitter size={24} />,
      color: '#1DA1F2',
      isConnected: false,
      isAvailable: false,
      description: 'Twitter API requires paid access'
    },
    {
      platform: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageCircle size={24} />,
      color: '#25D366',
      isConnected: false,
      isAvailable: false,
      description: 'WhatsApp Business API requires business verification'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check existing connections
    checkExistingConnections();
  }, []);

  const checkExistingConnections = async () => {
    // This would check your database for existing social connections
    // For now, we'll simulate checking
    console.log('Checking existing social connections...');
  };

  const handleConnect = async (platform: string) => {
    setIsLoading(true);
    
    try {
      switch (platform) {
        case 'facebook':
          await connectFacebook();
          break;
        case 'youtube':
          await connectYouTube();
          break;
        default:
          alert(`${platform} integration is not yet available.`);
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
      alert(`Failed to connect to ${platform}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const connectFacebook = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.login((response) => {
        if (response.authResponse) {
          console.log('Facebook connected:', response);
          setConnections(prev => 
            prev.map(conn => 
              conn.platform === 'facebook' 
                ? { ...conn, isConnected: true }
                : conn
            )
          );
          resolve();
        } else {
          reject(new Error('Facebook login cancelled'));
        }
      }, { scope: 'publish_actions' });
    });
  };

  const connectYouTube = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.gapi || !window.gapi.auth2) {
        reject(new Error('YouTube API not loaded'));
        return;
      }

      const auth2 = window.gapi.auth2.getAuthInstance();
      if (auth2.isSignedIn.get()) {
        console.log('YouTube already connected');
        setConnections(prev => 
          prev.map(conn => 
            conn.platform === 'youtube' 
              ? { ...conn, isConnected: true }
              : conn
          )
        );
        resolve();
      } else {
        auth2.signIn().then(() => {
          console.log('YouTube connected');
          setConnections(prev => 
            prev.map(conn => 
              conn.platform === 'youtube' 
                ? { ...conn, isConnected: true }
                : conn
            )
          );
          resolve();
        }).catch(reject);
      }
    });
  };

  const handleDisconnect = async (platform: string) => {
    setIsLoading(true);
    
    try {
      switch (platform) {
        case 'facebook':
          if (window.FB) {
            (window.FB as any).logout(() => {
              setConnections(prev => 
                prev.map(conn => 
                  conn.platform === 'facebook' 
                    ? { ...conn, isConnected: false }
                    : conn
                )
              );
            });
          }
          break;
        case 'youtube':
          if (window.gapi && window.gapi.auth2) {
            const auth2 = window.gapi.auth2.getAuthInstance();
            await auth2.signOut();
            setConnections(prev => 
              prev.map(conn => 
                conn.platform === 'youtube' 
                  ? { ...conn, isConnected: false }
                  : conn
              )
            );
          }
          break;
      }
    } catch (error) {
      console.error(`Error disconnecting from ${platform}:`, error);
      alert(`Failed to disconnect from ${platform}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #DC2626, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            Social Media Connections
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '1rem' }}>
            Connect your social media accounts to enable direct sharing from SoundBridge
          </p>
        </div>

        {/* Connections Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {connections.map((connection) => (
            <div
              key={connection.platform}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Platform Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: connection.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {connection.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    margin: '0 0 0.25rem 0'
                  }}>
                    {connection.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {connection.isConnected ? (
                      <>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#10B981'
                        }} />
                        <span style={{ color: '#10B981', fontSize: '0.875rem' }}>
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: connection.isAvailable ? '#F59E0B' : '#6B7280'
                        }} />
                        <span style={{ 
                          color: connection.isAvailable ? '#F59E0B' : '#6B7280', 
                          fontSize: '0.875rem' 
                        }}>
                          {connection.isAvailable ? 'Available' : 'Coming Soon'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{
                color: '#9CA3AF',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                marginBottom: '1.5rem'
              }}>
                {connection.description}
              </p>

              {/* Action Button */}
              {connection.isAvailable ? (
                <button
                  onClick={() => connection.isConnected 
                    ? handleDisconnect(connection.platform)
                    : handleConnect(connection.platform)
                  }
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: connection.isConnected 
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'linear-gradient(45deg, #DC2626, #EC4899)',
                    border: '1px solid',
                    borderColor: connection.isConnected 
                      ? '#EF4444'
                      : 'transparent',
                    borderRadius: '8px',
                    color: connection.isConnected ? '#EF4444' : 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid currentColor',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      {connection.isConnected ? 'Disconnecting...' : 'Connecting...'}
                    </>
                  ) : (
                    <>
                      {connection.isConnected ? <X size={16} /> : <Check size={16} />}
                      {connection.isConnected ? 'Disconnect' : 'Connect'}
                    </>
                  )}
                </button>
              ) : (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(107, 114, 128, 0.1)',
                  border: '1px solid rgba(107, 114, 128, 0.2)',
                  borderRadius: '8px',
                  color: '#6B7280',
                  fontSize: '0.875rem',
                  textAlign: 'center'
                }}>
                  Coming Soon
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px'
        }}>
          <h3 style={{
            color: '#3B82F6',
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '0.75rem'
          }}>
            💡 How it works
          </h3>
          <ul style={{
            color: '#9CA3AF',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            paddingLeft: '1.5rem'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Facebook:</strong> Connect your Facebook account to share tracks directly to your timeline
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>YouTube:</strong> Connect your YouTube account to share tracks to YouTube Studio or create Shorts
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Other platforms:</strong> For platforms without APIs, we copy share text to your clipboard
            </li>
            <li>
              <strong>Privacy:</strong> We only request the minimum permissions needed for sharing
            </li>
          </ul>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `
      }} />
    </div>
  );
}
