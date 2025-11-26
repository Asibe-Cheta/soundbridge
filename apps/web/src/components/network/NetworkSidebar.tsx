'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  Users, UserPlus, Users2, Calendar, BookOpen, 
  Briefcase, Loader2 
} from 'lucide-react';

interface NetworkStats {
  connections: number;
  pendingRequests: number;
  groups?: number;
  events?: number;
}

export function NetworkSidebar() {
  const { user } = useAuth();
  const [stats, setStats] = useState<NetworkStats>({
    connections: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    try {
      // Get connection count
      const connectionsRes = await fetch('/api/connections?limit=1');
      const connectionsData = await connectionsRes.json();
      
      // Get pending requests
      const requestsRes = await fetch('/api/connections/requests?type=received');
      const requestsData = await requestsRes.json();

      setStats({
        connections: connectionsData.success ? connectionsData.data?.total || 0 : 0,
        pendingRequests: requestsData.success ? requestsData.data?.requests?.length || 0 : 0,
      });
    } catch (error) {
      console.error('Error loading network stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-64">
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="space-y-4">
        {/* Manage My Network Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Manage my network</h4>
          <nav className="space-y-1">
            <Link
              href="/network?tab=connections"
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                <span className="text-sm text-gray-300 group-hover:text-white">Connections</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.connections}</span>
            </Link>
            
            <Link
              href="/network?tab=requests"
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                <span className="text-sm text-gray-300 group-hover:text-white">Pending Invitations</span>
              </div>
              {stats.pendingRequests > 0 && (
                <span className="text-sm font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                  {stats.pendingRequests}
                </span>
              )}
            </Link>

            <Link
              href="/network?tab=suggestions"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Users2 size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">People You May Know</span>
            </Link>

            <Link
              href="/events"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Calendar size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Events</span>
            </Link>

            <Link
              href="/network?tab=opportunities"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Briefcase size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Opportunities</span>
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}

