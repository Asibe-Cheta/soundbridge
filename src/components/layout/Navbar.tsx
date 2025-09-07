'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { LogOut, User, Upload, Home, Bell, Settings } from 'lucide-react';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import SearchDropdown from '@/src/components/search/SearchDropdown';

export default function Navbar() {
  const { user, signOut } = useAuth();
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

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isMobile) {
    return (
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="logo">
              <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
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
              className="p-2 text-foreground hover:bg-accent rounded-lg transition-colors"
              onClick={() => {
                // Mobile menu toggle logic can be added here
              }}
            >
              <User size={20} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="navbar-main flex items-center justify-between w-full gap-4">
          {/* LEFT SIDE */}
          <div className="navbar-left flex items-center gap-4 flex-shrink-0">
            <div className="logo">
              <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
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
            <nav className="nav flex gap-2">
              <Link href="/" className="active text-foreground hover:bg-accent transition-all duration-300 px-4 py-2 rounded-lg">
                For You
              </Link>
              <Link href="/discover" className="text-foreground hover:bg-accent transition-all duration-300 px-4 py-2 rounded-lg">
                Discover
              </Link>
              <Link href="/events" className="text-foreground hover:bg-accent transition-all duration-300 px-4 py-2 rounded-lg">
                Events
              </Link>
              <Link href="/creators" className="text-foreground hover:bg-accent transition-all duration-300 px-4 py-2 rounded-lg">
                Creators
              </Link>
              <Link href="/about" className="text-foreground hover:bg-accent transition-all duration-300 px-4 py-2 rounded-lg">
                About
              </Link>
            </nav>
            
            {/* Spacer between navigation and search */}
            <div className="w-1"></div>
          </div>

          {/* CENTER - Search Bar */}
          <div className="navbar-center">
            <SearchDropdown placeholder="Search creators, events, podcasts..." />
          </div>

          {/* RIGHT SIDE */}
          <div className="navbar-right flex items-center gap-3 flex-shrink-0">
            {/* Upload Button */}
            <Link href="/upload" className="no-underline">
              <button className="bg-gradient-to-r from-primary-red to-accent-pink text-white border-none px-4 py-2 rounded-lg cursor-pointer font-semibold text-sm flex items-center gap-1 transition-all duration-300 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
                <Upload size={16} />
                Upload
              </button>
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative">
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
                  className="bg-card border-2 border-accent rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md hover:bg-accent/10 hover:scale-105 hover:shadow-lg"
                >
                  <User size={20} className="text-accent" />
                </button>
                
                <div
                  id="user-menu"
                  className="absolute top-full right-0 mt-2 bg-card/50 backdrop-blur-xl border border-border rounded-xl p-2 min-w-[200px] hidden z-50 shadow-2xl"
                >
                  <Link href="/dashboard" className="no-underline">
                    <div className="flex items-center gap-3 p-3 text-foreground rounded-lg transition-all duration-300 font-medium hover:bg-accent/10">
                      <Home size={16} />
                      Dashboard
                    </div>
                  </Link>
                  <Link href="/notifications" className="no-underline">
                    <div className="flex items-center gap-3 p-3 text-foreground rounded-lg transition-all duration-300 font-medium hover:bg-accent/10">
                      <Bell size={16} />
                      Notifications
                    </div>
                  </Link>
                  <Link href="/profile" className="no-underline">
                    <div className="flex items-center gap-3 p-3 text-foreground rounded-lg transition-all duration-300 font-medium hover:bg-accent/10">
                      <User size={16} />
                      Profile
                    </div>
                  </Link>
                  <Link href="/settings" className="no-underline">
                    <div className="flex items-center gap-3 p-3 text-foreground rounded-lg transition-all duration-300 font-medium hover:bg-accent/10">
                      <Settings size={16} />
                      Settings
                    </div>
                  </Link>
                  
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  <div className="h-px bg-border my-2"></div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 p-3 text-red-300 bg-transparent border-none w-full text-left rounded-lg cursor-pointer transition-all duration-300 hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link href="/login" className="no-underline">
                  <button className="bg-transparent text-muted-foreground border border-border px-6 py-3 rounded-xl cursor-pointer font-semibold text-sm transition-all duration-300 hover:bg-accent/10 hover:border-accent">
                    Sign in
                  </button>
                </Link>
                <Link href="/signup" className="no-underline">
                  <button className="bg-gradient-to-r from-primary-red to-accent-pink text-white border-none px-6 py-3 rounded-xl cursor-pointer font-semibold text-sm transition-all duration-300 shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
                    Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
