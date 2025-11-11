'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMessaging } from '../../src/hooks/useMessaging';
import type { Conversation, ConversationParticipant } from '../../src/lib/types/messaging';
import { MessageCircle, Search, ArrowLeft, Bell, Settings, AlertCircle, Send, MoreVertical, User, LogOut, Menu } from 'lucide-react';

export default function MessagingPage() {
  const { user, signOut } = useAuth();
  const {
    conversations,
    selectedConversationId,
    messages,
    isLoading,
    error,
    typingUsers,
    unreadCount,
    sendMessage,
    selectConversation,
    searchMessages,
    setSearchQuery
  } = useMessaging();
  
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      await sendMessage(messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchMessages(query);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return null;
    return conversation.participants?.find((p: ConversationParticipant) => p.id !== user.id) || 
           conversation.lastMessage?.sender?.id !== user.id ? conversation.lastMessage?.sender : conversation.lastMessage?.recipient;
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <MessageCircle size={48} style={{ color: 'white', marginBottom: '1rem' }} />
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Login Required</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem' }}>
            Please log in to access the messaging feature.
          </p>
          <Link href="/auth/login" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>

        {isMobile ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <Menu size={24} />
              </button>
              <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                SoundBridge
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}>
                <Bell size={20} />
              </button>
              <button style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}>
                <Settings size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                SoundBridge
              </h1>
              <nav style={{ display: 'flex', gap: '1.5rem' }}>
                <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem' }}>
                  Home
                </Link>
                <Link href="/events" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem' }}>
                  Events
                </Link>
                <Link href="/upload" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem' }}>
                  Upload Podcast
                </Link>
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}>
                <Bell size={20} />
              </button>
              <button style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}>
                <Settings size={20} />
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid #EC4899',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#EC4899',
                    fontWeight: '600'
                  }}
                >
                  {user.email?.charAt(0).toUpperCase() || <User size={20} />}
                </button>
                {isMobileMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid #EC4899',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    minWidth: '150px',
                    zIndex: 1000
                  }}>
                    <div style={{
                      padding: '0.5rem',
                      color: '#EC4899',
                      fontSize: '0.9rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      {user.email}
                    </div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: '#EC4899',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Main Content */}
      <main className="main-container">
        {/* Back Button */}
        <div style={{ padding: '1rem 0' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#fca5a5'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Messaging Interface */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '350px 1fr',
          gap: '1rem',
          height: 'calc(100vh - 200px)',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Conversations Sidebar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRight: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                Messages
              </h2>
              <div style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {unreadCount}
              </div>
            </div>

            {/* Search */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#666' }} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  onChange={handleSearchChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              {isLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  color: '#999'
                }}>
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#999'
                }}>
                  <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    No conversations yet
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                    Start a conversation with other users
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => selectConversation(conversation.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: selectedConversationId === conversation.id
                          ? 'rgba(236, 72, 153, 0.2)'
                          : 'transparent',
                        border: selectedConversationId === conversation.id
                          ? '1px solid rgba(236, 72, 153, 0.3)'
                          : '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedConversationId !== conversation.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedConversationId !== conversation.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1.1rem',
                        flexShrink: 0
                      }}>
                        {otherUser?.display_name?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem'
                        }}>
                          <h3 style={{
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {otherUser?.display_name || otherUser?.username || 'Unknown User'}
                          </h3>
                          <span style={{
                            color: '#999',
                            fontSize: '0.75rem',
                            flexShrink: 0
                          }}>
                            {conversation.lastMessage ? formatTimestamp(conversation.lastMessage.created_at) : ''}
                          </span>
                        </div>
                        <p style={{
                          color: '#ccc',
                          fontSize: '0.85rem',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      {conversation.unreadCount > 0 && (
                        <div style={{
                          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            {selectedConversationId ? (
              <>
                {/* Chat Header */}
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem'
                    }}>
                      {(() => {
                        const conversation = conversations.find(c => c.id === selectedConversationId);
                        const otherUser = conversation ? getOtherParticipant(conversation) : null;
                        return otherUser?.display_name?.charAt(0) || otherUser?.username?.charAt(0) || '?';
                      })()}
                    </div>
                    <div>
                      <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                        {(() => {
                          const conversation = conversations.find(c => c.id === selectedConversationId);
                          const otherUser = conversation ? getOtherParticipant(conversation) : null;
                          return otherUser?.display_name || otherUser?.username || 'Unknown User';
                        })()}
                      </h3>
                      <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>
                        {typingUsers.length > 0 ? 'Typing...' : 'Online'}
                      </p>
                    </div>
                  </div>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {isLoading ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem',
                      color: '#999'
                    }}>
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#999'
                    }}>
                      <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        No messages yet
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                        Start the conversation by sending a message
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          justifyContent: message.sender_id === user.id ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          maxWidth: '70%',
                          padding: '0.75rem 1rem',
                          borderRadius: '16px',
                          background: message.sender_id === user.id
                            ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                            : 'rgba(255, 255, 255, 0.1)',
                          border: message.sender_id !== user.id ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: 'white',
                          fontSize: '0.9rem',
                          lineHeight: '1.4'
                        }}>
                          <p style={{ margin: 0, marginBottom: '0.25rem' }}>
                            {message.content}
                          </p>
                          <span style={{
                            color: message.sender_id === user.id ? 'rgba(255, 255, 255, 0.8)' : '#999',
                            fontSize: '0.75rem'
                          }}>
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div style={{
                  padding: '1.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          maxHeight: '120px',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '0.9rem',
                          resize: 'none',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      style={{
                        background: messageText.trim()
                          ? 'linear-gradient(45deg, #DC2626, #EC4899)'
                          : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        opacity: messageText.trim() ? 1 : 0.5
                      }}
                      onMouseEnter={(e) => {
                        if (messageText.trim()) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (messageText.trim()) {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <MessageCircle size={64} style={{ color: '#666', marginBottom: '1rem' }} />
                <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Select a conversation
                </h3>
                <p style={{ color: '#999', fontSize: '1rem', margin: 0 }}>
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
} 