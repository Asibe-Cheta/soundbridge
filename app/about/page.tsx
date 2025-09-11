'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { Footer } from '../../src/components/layout/Footer';
import RiveLogo from '../../src/components/ui/RiveLogo';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import {
  Music,
  Users,
  Globe,
  Heart,
  Target,
  Lightbulb,
  ArrowRight,
  Play,
  Upload,
  DollarSign,
  Calendar,
  MapPin,
  Sparkles,
  User,
  Bell,
  Settings,
  LogOut,
  Search,
  Home,
  Menu,
  X
} from 'lucide-react';
import SearchDropdown from '@/src/components/search/SearchDropdown';

export default function AboutPage() {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle mobile responsiveness
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  React.useEffect(() => {
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
    <div style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
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
              <Image
                src="/images/logos/logo-trans-lockup.png"
                alt="SoundBridge Logo"
                width={80}
                height={22}
                priority
                style={{ height: 'auto' }}
              />
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
               <Image
                 src="/images/logos/logo-trans-lockup.png"
                 alt="SoundBridge Logo"
                 width={120}
                 height={32}
                 priority
                 style={{ height: 'auto' }}
               />
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
                <Image
                  src="/images/logos/logo-trans-lockup.png"
                  alt="SoundBridge Logo"
                  width={100}
                  height={28}
                  priority
                  style={{ height: 'auto' }}
                />
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
                <Users size={20} style={{ color: '#10B981' }} />
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
                  background: 'rgba(220, 38, 38, 0.2)',
                  border: '1px solid rgba(220, 38, 38, 0.5)',
                  fontSize: '17px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'}
              >
                <Users size={20} style={{ color: '#DC2626' }} />
                About
              </Link>
            </nav>
          </div>
        )}

      {/* Main Content */}
      <main className="main-container" style={{ backgroundColor: '#000000' }}>
        <style jsx>{`
          @media (max-width: 768px) {
            .desktop-hero {
              display: none !important;
            }
            .mobile-hero {
              display: flex !important;
            }
          }
          @media (min-width: 769px) {
            .desktop-hero {
              display: grid !important;
            }
            .mobile-hero {
              display: none !important;
            }
          }
        `}</style>
        {/* Hero Section with Rive Logo */}
        <section className="desktop-hero" style={{
          padding: '2rem',
          margin: '2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          {/* Left Side - Text Content */}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1.5rem',
              lineHeight: '1.1'
            }}>
              About SoundBridge
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              The world&apos;s first truly level playing field for musicians and creators, 
              where discovery meets collaboration and every voice has the potential to be heard.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
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
                  Join SoundBridge
                  <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/discover" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  Explore Platform
                  <Music size={16} />
                </button>
              </Link>
            </div>
          </div>

          {/* Right Side - Rive Logo */}
          <div style={{
            height: '500px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RiveLogo
              className="hero-logo"
              width={500}
              height={500}
              autoplay={true}
              loop={true}
            />
          </div>
        </section>

        {/* Mobile Responsive Hero */}
        <section style={{
          padding: '2rem',
          margin: '2rem',
          display: 'none',
          textAlign: 'center',
          flexDirection: 'column',
          gap: '2rem',
          alignItems: 'center'
        }} className="mobile-hero">
          <div style={{
            height: '300px',
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RiveLogo
              className="mobile-hero-logo"
              width={400}
              height={300}
              autoplay={true}
              loop={true}
            />
          </div>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
              lineHeight: '1.1'
            }}>
              About SoundBridge
            </h1>
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              The world&apos;s first truly level playing field for musicians and creators, 
              where discovery meets collaboration and every voice has the potential to be heard.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/signup" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Join SoundBridge
                  <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/discover" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Explore Platform
                  <Music size={16} />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* The Story Section */}
        <section style={{ padding: '4rem 2rem' }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '3rem'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightbulb size={24} color="white" />
              </div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                The Story Behind SoundBridge
              </h2>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '3rem',
              marginBottom: '3rem'
            }}>
              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                SoundBridge was born from a moment of simple frustration that sparked a revolutionary idea. 
                Our founder found himself experiencing the all-too-familiar struggle of boredom - wanting to 
                discover and attend live music events but feeling disconnected from the traditional discovery 
                methods that dominated the landscape.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                The conventional approaches felt distant and impersonal. Eventbrite required endless scrolling 
                through irrelevant listings. Social media ads felt intrusive and poorly targeted. Spotify&apos;s 
                event recommendations seemed disconnected from local scenes. Facebook events got lost in crowded 
                feeds. Traditional music blogs and websites demanded active searching rather than intuitive discovery.
              </p>

              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}>
                What was needed wasn&apos;t another app to check or another platform to search through. The vision 
                was for something that would meet people at their doorstep - events and creators that would find 
                their ideal audience organically, and audiences who would discover exactly what they didn&apos;t 
                know they were looking for.
              </p>

              <div style={{
                background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.1), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                padding: '2rem',
                marginTop: '2rem'
              }}>
                <p style={{
                  fontSize: '1.1rem',
                  lineHeight: '1.8',
                  color: 'white',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  &quot;The breakthrough insight came through recognizing that event discovery shouldn&apos;t rely on 
                  advertising budgets or algorithmic luck. Instead, it should work through intentional invitation - 
                  where your events naturally reach people who have optimized their accounts to see exactly what 
                  you&apos;re offering.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderRadius: '20px',
          margin: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '1rem'
          }}>
            Join the SoundBridge Revolution
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            Be part of the future of music discovery and creator collaboration. 
            Your next favorite artist or perfect collaboration partner is waiting.
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
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
                Get Started
                <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '1rem 2rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                Explore Now
                <Music size={16} />
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}