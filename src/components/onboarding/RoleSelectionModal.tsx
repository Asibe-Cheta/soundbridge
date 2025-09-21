'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding, UserRole } from '@/src/contexts/OnboardingContext';
import { Music, Mic, Calendar, Users, X, SkipForward } from 'lucide-react';
import Image from 'next/image';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleOptions = [
  {
    id: 'musician' as UserRole,
    title: 'Musician / Artist',
    description: 'Upload tracks, build your fanbase, and connect with other artists',
    icon: Music,
    gradient: 'from-red-500 to-pink-500'
  },
  {
    id: 'podcaster' as UserRole,
    title: 'Podcaster',
    description: 'Share your episodes, grow your audience, and find collaborators',
    icon: Mic,
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'event_promoter' as UserRole,
    title: 'Event Promoter',
    description: 'Create events, manage attendees, and promote your shows',
    icon: Calendar,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    id: 'listener' as UserRole,
    title: 'Music Lover',
    description: 'Discover new music, attend events, and support your favorite artists',
    icon: Users,
    gradient: 'from-gray-500 to-slate-500'
  }
];

export function RoleSelectionModal({ isOpen, onClose }: RoleSelectionModalProps) {
  const { setSelectedRole, setCurrentStep } = useOnboarding();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentStep('profile_setup');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4" style={{ paddingTop: isMobile ? '1rem' : '8rem' }}>
      <div 
        className="relative w-full mx-auto overflow-y-auto"
        style={{
          maxWidth: isMobile ? '100%' : '64rem',
          maxHeight: isMobile ? '90vh' : '75vh',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '1rem' }}>
            <Image
              src="/images/logos/logo-trans.png"
              alt="SoundBridge"
              width={isMobile ? 80 : 120}
              height={isMobile ? 24 : 36}
              style={{ height: 'auto' }}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="text-white/70 hover:text-white" size={isMobile ? 18 : 20} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: isMobile ? '1rem' : '2rem' }}>
          <div className="text-center" style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
            <h2 className="font-bold text-white" style={{
              fontSize: isMobile ? '1.3rem' : '1.875rem',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              lineHeight: isMobile ? '1.3' : '1.1'
            }}>
              Choose Your Role
            </h2>
            <p className="text-white/70" style={{
              fontSize: isMobile ? '0.9rem' : '1.125rem',
              lineHeight: '1.6'
            }}>
              What kind of creator are you? This helps us personalize your experience.
            </p>
          </div>

          {/* Role Options */}
          <div className="overflow-x-auto">
            <div className="flex min-w-max md:grid md:grid-cols-2 lg:grid-cols-4 md:min-w-0" style={{ gap: isMobile ? '1rem' : '2rem' }}>
            {roleOptions.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group text-left rounded-xl transition-all duration-200 hover:bg-white/10"
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    minWidth: isMobile ? '150px' : '200px'
                  }}
                >
                  <div className="flex flex-col items-center text-center" style={{ gap: isMobile ? '0.5rem' : '0.75rem' }}>
                    <div 
                      className={`rounded-lg bg-gradient-to-r ${role.gradient}`}
                      style={{
                        padding: isMobile ? '0.5rem' : '0.75rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      <Icon className="text-white" size={isMobile ? 18 : 20} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-pink-300 transition-colors" style={{
                        fontSize: isMobile ? '0.8rem' : '1rem',
                        marginBottom: isMobile ? '0.25rem' : '0.25rem'
                      }}>
                        {role.title}
                      </h3>
                      <p className="text-white/70 leading-relaxed" style={{
                        fontSize: isMobile ? '0.7rem' : '0.75rem'
                      }}>
                        {role.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div className="flex items-center justify-between" style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.5rem' : '0' }}>
            <button
              onClick={() => {
                setSelectedRole('listener');
                setCurrentStep('profile_setup');
                onClose();
              }}
              className="flex items-center text-white/50 hover:text-white/70 transition-colors"
              style={{
                gap: isMobile ? '0.25rem' : '0.5rem',
                padding: isMobile ? '0.5rem 0.75rem' : '0.75rem',
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            >
              <SkipForward size={isMobile ? 14 : 16} />
              <span>Skip role selection</span>
            </button>
            <p className="text-white/50 text-center" style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              lineHeight: '1.4'
            }}>
              Don't worry, you can always change this later in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}