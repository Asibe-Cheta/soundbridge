'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';
import {
  User,
  Bell,
  Settings,
  LogOut,
  Search,
  Home,
  Menu,
  X,
  Upload,
  Calendar
} from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle search focus from mobile menu
  useEffect(() => {
    if (shouldFocusSearch) {
      const focusSearch = () => {
        console.log('Dispatching global focus event');
        // Dispatch global event to focus search input
        window.dispatchEvent(new CustomEvent('focusSearchInput'));
        setShouldFocusSearch(false);
      };
      
      // Much longer delay to ensure menu is fully closed and DOM is stable
      setTimeout(focusSearch, 1000);
    }
  }, [shouldFocusSearch]);

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

  return (
    <>
      {/* Header */}
      <header className="header">
        {isMobile ? (
          /* Mobile Header - Apple Music Style */
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
              <Menu size={24} color="white" />
            </button>

            {/* CENTER - Small Logo */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flex: 1
            }}>
              <Link href="/">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={80}
                  height={22}
                  priority
                  style={{ height: 'auto' }}
                />
              </Link>
            </div>

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
                     color: '#DC2626',
                     border: 'none',
                     padding: '8px 16px',
                     cursor: 'pointer',
                     fontWeight: '500',
                     fontSize: '16px',
                     transition: 'all 0.2s ease'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                   onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                 >
                   Sign In
                 </button>
               </Link>
             )}
           </div>
         </div>
       ) : (
         /* Desktop Header - Original Style */
         <div className="navbar-main" style={{ 
           display: 'flex', 
           alignItems: 'center', 
           justifyContent: 'space-between',
           width: '100%',
           gap: '1rem'
         }}>
           {/* LEFT SIDE */}
           <div className="navbar-left" style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '1rem',
             flexShrink: 0
           }}>
             <div className="logo">
               <Link href="/">
                 <Image
                   src="/images/logos/logo-trans-lockup.png"
                   alt="SoundBridge Logo"
                   width={120}
                   height={32}
                   priority
                   style={{ height: 'auto' }}
                 />
               </Link>
             </div>
             {/* Desktop Navigation */}
             <nav className="nav" style={{ display: 'flex', gap: '0.5rem' }}>
               <Link href="/" style={{ 
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
               <Link href="/discover" style={{ 
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
               <Link href="/events" style={{ 
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
               <Link href="/creators" style={{ 
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
               <Link href="/about" style={{ 
                 textDecoration: 'none', 
                 color: 'var(--text-primary)',
                 transition: 'all 0.3s ease',
                 padding: '0.5rem 1rem',
                 borderRadius: '8px'
               }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                 About
               </Link>
             </nav>
             
             {/* Spacer between navigation and search */}
             <div style={{ width: '0.25rem' }}></div>
           </div>

           {/* CENTER - Search Bar */}
           <div className="navbar-center">
             <SearchDropdown placeholder="Search creators, events, podcasts..." />
           </div>

           {/* RIGHT SIDE */}
           <div className="navbar-right" style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '0.75rem',
             flexShrink: 0
           }}>
             {/* Upload Button */}
             <Link href="/upload" style={{ textDecoration: 'none' }}>
               <button 
                 style={{
                   background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                   color: 'white',
                   border: 'none',
                   padding: '0.5rem 1rem',
                   borderRadius: '8px',
                   cursor: 'pointer',
                   fontWeight: '600',
                   fontSize: '0.8rem',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.25rem',
                   transition: 'all 0.3s ease',
                   boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.transform = 'translateY(-2px)';
                   e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.transform = 'translateY(0)';
                   e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
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
                     background: 'rgba(255, 255, 255, 0.05)',
                     backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     borderRadius: '12px',
                     padding: '0.5rem',
                     minWidth: '200px',
                     display: 'none',
                     zIndex: 1000,
                     boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
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
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    Sign in
                  </button>
                </Link>
               <Link href="/signup" style={{ textDecoration: 'none' }}>
                 <button 
                   style={{
                     background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                     color: 'white',
                     border: 'none',
                     padding: '0.75rem 1.5rem',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     fontWeight: '600',
                     fontSize: '0.9rem',
                     transition: 'all 0.3s ease',
                     boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
                   }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Sign up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )}
  </header>

      {/* Mobile Menu Overlay - Apple Music Style */}
      {isMobile && isMobileMenuOpen && (
        <div
          id="mobile-menu"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {/* Mobile Menu Header - Apple Music Style */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            padding: '1rem 0'
          }}>
            <div className="logo">
              <Link href="/">
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={100}
                  height={28}
                  priority
                  style={{ height: 'auto' }}
                />
              </Link>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={16} color="white" />
            </button>
          </div>

          {/* Mobile Navigation - Apple Music Style */}
          <nav style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem',
            marginBottom: '2rem'
          }}>
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <Home size={20} style={{ color: '#DC2626' }} />
              For You
            </Link>
            <Link 
              href="/discover" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <Search size={20} style={{ color: '#EC4899' }} />
              Discover
            </Link>
            
            {/* Mobile Search Option */}
            <div 
              onClick={() => {
                console.log('Mobile search option clicked');
                setIsMobileMenuOpen(false);
                setShouldFocusSearch(true);
              }}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <Search size={20} style={{ color: '#DC2626' }} />
              Search
            </div>
            <Link 
              href="/events" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <Calendar size={20} style={{ color: '#F97316' }} />
              Events
            </Link>
            <Link 
              href="/creators" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <User size={20} style={{ color: '#10B981' }} />
              Creators
            </Link>
            <Link 
              href="/about" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ 
                textDecoration: 'none', 
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                fontSize: '17px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <User size={20} style={{ color: '#8B5CF6' }} />
              About
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}