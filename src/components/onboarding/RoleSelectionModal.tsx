'use client';

import React from 'react';
import { useOnboarding, UserRole } from '@/src/contexts/OnboardingContext';
import { Music, Mic, Calendar, Users, X } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentStep('profile_setup');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-20">
      <div 
        className="relative w-full max-w-6xl mx-auto max-h-[85vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logos/logo-trans.png"
              alt="SoundBridge"
              width={120}
              height={36}
              style={{ height: 'auto' }}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white/70 hover:text-white" strokeWidth={2} />
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">
              Choose Your Role
            </h2>
            <p className="text-white/70 text-lg">
              What kind of creator are you? This helps us personalize your experience.
            </p>
          </div>

          {/* Role Options */}
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max md:grid md:grid-cols-2 lg:grid-cols-4 md:min-w-0">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group p-6 text-left rounded-xl transition-all duration-300 hover:scale-105 min-w-[280px]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div 
                      className={`p-4 rounded-xl bg-gradient-to-r ${role.gradient}`}
                      style={{
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-pink-400 transition-colors mb-2">
                        {role.title}
                      </h3>
                      <p className="text-white/70 text-sm leading-relaxed">
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
        <div className="p-6 border-t border-white/10">
          <p className="text-sm text-white/50 text-center">
            Don't worry, you can always change this later in your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}