'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  LogOut, User, Upload, Search, Bell, Settings, Home, Menu
} from 'lucide-react';

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export function Header({ 
  showSearch = true, 
  searchPlaceholder = "Search creators, events, podcasts...",
  onSearch 
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      const userMenu = document.getElementById('user-menu');
      const userMenuButton = document.getElementById('user-menu-button');
      
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      
      if (userMenu && userMenuButton && 
          !userMenu.contains(event.target as Node) && 
          !userMenuButton.contains(event.target as Node)) {
        userMenu.style.display = 'none';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <header className="header">
      {isMobile ? (
        /* Mobile Header */
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%'
        }}>
          {/* LEFT - Hamburger Menu */}
          <button
            id="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Menu size={24} color="var(--text-primary)" />
          </button>

          {/* CENTER - Small Logo */}
          <Link href="/" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flex: 1,
            textDecoration: 'none'
          }}>
            <Image
              src="/images/logos/logo-trans-lockup.png"
              alt="SoundBridge Logo"
              width={80}
              height={22}
              priority
              style={{ height: 'auto' }}
            />
          </Link>

          {/* RIGHT - Sign In / Profile */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  id="user-menu-button"
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      const menu = document.getElementById('user-menu');
                      if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                      }
                    } catch (error) {
                      console.error('Error toggling user menu:', error);
                    }
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <User size={20} color="var(--accent-primary)" />
                </button>
                
                <div
                  id="user-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    minWidth: '200px',
                    display: 'none',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Home size={16} />
                      Dashboard
                    </div>
                  </Link>
                  <Link href="/notifications" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Bell size={16} />
                      Notifications
                    </div>
                  </Link>
                  <Link href="/profile" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={16} />
                      Profile
                    </div>
                  </Link>
                  <Link href="/settings" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={16} />
                      Settings
                    </div>
                  </Link>
                  
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: '#FCA5A5',
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    background: 'none',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--accent-primary)',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Desktop Header */
        <>
          {/* LEFT SIDE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
              <Image
                src="/images/logos/logo-trans-lockup.png"
                alt="SoundBridge Logo"
                width={120}
                height={32}
                priority
                style={{ height: 'auto' }}
              />
            </Link>
                         <nav className="nav">
                                <Link href="/" className="text-base text-display font-medium" style={{ 
                   textDecoration: 'none', 
                   color: 'var(--text-primary)',
                   transition: 'all 0.3s ease',
                   padding: '0.5rem 1rem',
                   borderRadius: '8px'
                 }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 For You
               </Link>
                                <Link href="/discover" className="text-base text-display font-medium" style={{ 
                   textDecoration: 'none', 
                   color: 'var(--text-primary)',
                   transition: 'all 0.3s ease',
                   padding: '0.5rem 1rem',
                   borderRadius: '8px'
                 }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 Discover
               </Link>
                                <Link href="/events" className="text-base text-display font-medium" style={{ 
                   textDecoration: 'none', 
                   color: 'var(--text-primary)',
                   transition: 'all 0.3s ease',
                   padding: '0.5rem 1rem',
                   borderRadius: '8px'
                 }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 Events
               </Link>
                                <Link href="/creators" className="text-base text-display font-medium" style={{ 
                   textDecoration: 'none', 
                   color: 'var(--text-primary)',
                   transition: 'all 0.3s ease',
                   padding: '0.5rem 1rem',
                   borderRadius: '8px'
                 }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 Creators
               </Link>
             </nav>
          </div>

          {/* CENTER - Search Bar */}
          {showSearch && (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              maxWidth: '500px', 
              marginRight: '2rem'
            }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                <input 
                  type="search" 
                  className="search-bar" 
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  style={{ 
                    width: '100%', 
                    paddingLeft: '40px',
                    fontSize: '16px'
                  }} 
                />
              </div>
            </div>
          )}

          {/* RIGHT SIDE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Upload Button */}
            <Link href="/upload" style={{ textDecoration: 'none' }}>
              <button 
                style={{
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-md)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                <Upload size={16} />
                Upload
              </button>
            </Link>

            {/* User Menu */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  id="user-menu-button"
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      const menu = document.getElementById('user-menu');
                      if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                      }
                    } catch (error) {
                      console.error('Error toggling user menu:', error);
                    }
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <User size={20} color="var(--accent-primary)" />
                </button>
                
                <div
                  id="user-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    minWidth: '200px',
                    display: 'none',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Home size={16} />
                      Dashboard
                    </div>
                  </Link>
                  <Link href="/notifications" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Bell size={16} />
                      Notifications
                    </div>
                  </Link>
                  <Link href="/profile" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={16} />
                      Profile
                    </div>
                  </Link>
                  <Link href="/settings" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={16} />
                      Settings
                    </div>
                  </Link>
                  
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  <div style={{ height: '1px', background: 'var(--border-primary)', margin: '0.5rem 0' }}></div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      color: '#FCA5A5',
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button 
                    style={{
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--accent-primary)',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    Sign in
                  </button>
                </Link>
                <Link href="/signup" style={{ textDecoration: 'none' }}>
                  <button 
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                  >
                    Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
} 