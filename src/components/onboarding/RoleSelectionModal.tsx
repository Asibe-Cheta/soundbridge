'use client';

import React from 'react';
import { useOnboarding, UserRole } from '@/src/contexts/OnboardingContext';
import { Music, Mic, Calendar, Users, X } from 'lucide-react';

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
    color: 'from-red-500 to-pink-500',
    priority: 1
  },
  {
    id: 'podcaster' as UserRole,
    title: 'Podcaster',
    description: 'Share your episodes, grow your audience, and find collaborators',
    icon: Mic,
    color: 'from-blue-500 to-purple-500',
    priority: 2
  },
  {
    id: 'event_promoter' as UserRole,
    title: 'Event Promoter',
    description: 'Create events, manage attendees, and promote your shows',
    icon: Calendar,
    color: 'from-green-500 to-teal-500',
    priority: 3
  },
  {
    id: 'listener' as UserRole,
    title: 'Music Lover',
    description: 'Discover new music, attend events, and support your favorite artists',
    icon: Users,
    color: 'from-gray-500 to-slate-500',
    priority: 4
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to SoundBridge! 🎵
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              What kind of creator are you? This helps us personalize your experience.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Role Options */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-500 dark:hover:border-red-400 transition-all duration-200 hover:shadow-lg text-left"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${role.color} flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {role.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Don't worry, you can always change this later in your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}
