'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  Search, 
  Menu, 
  X, 
  Upload, 
  User, 
  Settings, 
  LogOut, 
  Bell,
  ChevronDown,
  Dashboard
} from 'lucide-react';
import { Button } from '../ui/Button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export function Header() {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Core navigation items (left side)
  const navigation = [
    { name: 'For You', href: '/' },
    { name: 'Discover', href: '/discover' },
    { name: 'Events', href: '/events' },
    { name: 'Creators', href: '/creators' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT SIDE: Logo and Core Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-red to-accent-pink rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full"></div>
              </div>
              <span className="text-xl font-bold text-white">SoundBridge</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white/70 hover:text-white transition-colors duration-200 font-medium px-3 py-2 rounded-md hover:bg-white/5"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* CENTER: Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Search music, events, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-red focus:border-transparent"
              />
            </div>
          </div>

          {/* RIGHT SIDE: Upload Button and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Upload Button */}
            <Link href="/upload">
              <Button variant="primary" size="sm" className="hidden sm:flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            </Link>

            {/* User Menu or Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-white/10">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary-red to-accent-pink text-white text-sm font-semibold">
                        {getUserInitials(user.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-white/80 text-sm">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-white/80">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center space-x-2 cursor-pointer">
                      <Dashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/notifications" className="flex items-center space-x-2 cursor-pointer">
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center space-x-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 cursor-pointer text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:text-white/80 transition-colors p-2"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background-secondary/50 backdrop-blur-xl border-t border-white/10">
              {/* Mobile Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="text"
                  placeholder="Search music, events, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-red focus:border-transparent"
                />
              </div>

              {/* Mobile Navigation Links */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Mobile Upload Button */}
              <Link href="/upload">
                <Button variant="primary" size="sm" className="w-full mt-4 flex items-center justify-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Button>
              </Link>

              {/* Mobile Auth Buttons or User Info */}
              {user ? (
                <div className="pt-4 space-y-2 border-t border-white/10">
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary-red to-accent-pink text-white text-sm font-semibold">
                        {getUserInitials(user.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </p>
                      <p className="text-white/60 text-xs">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/dashboard" className="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-md">
                    Dashboard
                  </Link>
                  <Link href="/notifications" className="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-md">
                    Notifications
                  </Link>
                  <Link href="/profile" className="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-md">
                    Profile
                  </Link>
                  <Link href="/settings" className="block px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-md">
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 space-y-2 border-t border-white/10">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="w-full text-white/80 hover:text-white hover:bg-white/10">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" size="sm" className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 