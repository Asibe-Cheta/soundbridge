'use client';

import React from 'react';
import { Music, Mic, Calendar, Users } from 'lucide-react';

export function Sidebar() {
  const quickActions = [
    { icon: Music, label: 'Upload Music', color: 'text-primary-red' },
    { icon: Mic, label: 'Start Podcast', color: 'text-accent-pink' },
    { icon: Calendar, label: 'Create Event', color: 'text-coral' },
    { icon: Users, label: 'Find Collaborators', color: 'text-primary-red' },
  ];

  const friendsActivity = [
    { name: 'John', action: 'is listening to "Praise Medley"' },
    { name: 'Sarah', action: 'posted a new track' },
    { name: 'Mike', action: 'joined Gospel Night event' },
  ];

  return (
    <aside className="fixed right-8 top-1/2 transform -translate-y-1/2 w-72 glass rounded-2xl p-6 hidden xl:block">
      <h3 className="text-xl font-bold text-accent-pink mb-6">Quick Actions</h3>

      <div className="space-y-3 mb-8">
        {quickActions.map((action, index) => (
          <div
            key={index}
            className="quick-action bg-primary-red/10 border border-primary-red/30 text-primary-red p-3 rounded-lg text-center cursor-pointer transition-all duration-300 hover:bg-primary-red/20"
          >
            <div className="flex items-center justify-center gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-bold text-accent-pink mb-4">Friends Activity</h3>
      <div className="space-y-3 text-sm">
        {friendsActivity.map((friend, index) => (
          <div key={index} className="text-white/80">
            <span className="font-semibold text-white">{friend.name}</span> {friend.action}
          </div>
        ))}
      </div>
    </aside>
  );
} 