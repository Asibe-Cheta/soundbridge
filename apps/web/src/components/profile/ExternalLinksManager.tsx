/**
 * External Links Manager Component
 *
 * Allows creators to manage their external portfolio links in profile settings
 *
 * Features:
 * - Display existing links with click counts
 * - Add new link (modal)
 * - Edit existing link (modal)
 * - Delete link (with confirmation)
 * - Maximum 2 links enforced
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Loader2, Instagram, Youtube, Music, Cloud, Globe } from 'lucide-react';
import { PLATFORM_METADATA, type PlatformType } from '@/src/lib/external-links-validation';
import { AddExternalLinkModal } from './AddExternalLinkModal';
import type { ExternalLink } from '@/src/lib/types/external-links';

interface ExternalLinksManagerProps {
  userId?: string;
}

// Helper to get Lucide icon component for platform
function getPlatformIcon(platform: PlatformType, size: number = 20) {
  const iconMap = {
    instagram: Instagram,
    youtube: Youtube,
    spotify: Music,
    apple_music: Music,
    soundcloud: Cloud,
    website: Globe
  };

  const IconComponent = iconMap[platform] || Globe;
  return <IconComponent size={size} />;
}

export function ExternalLinksManager({ userId }: ExternalLinksManagerProps) {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);

  const loadLinks = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/profile/external-links?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setLinks(data.data.links || []);
      }
    } catch (err) {
      console.error('Failed to load external links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [userId]);

  const handleDelete = async (linkId: string) => {
    if (!confirm('Remove this link from your portfolio?')) return;

    try {
      const res = await fetch(`/api/profile/external-links/${linkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setLinks(prev => prev.filter(l => l.id !== linkId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete link');
      }
    } catch (err) {
      console.error('Failed to delete link:', err);
      alert('Failed to remove link. Please try again.');
    }
  };

  const canAddMore = links.length < 2;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Links */}
      {links.length > 0 && (
        <div className="space-y-3">
          {links
            .sort((a, b) => a.display_order - b.display_order)
            .map((link) => {
              const metadata = PLATFORM_METADATA[link.platform_type];
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: metadata.color + '20', color: metadata.color }}
                    >
                      {getPlatformIcon(link.platform_type, 20)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{metadata.name}</div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-red-400 truncate flex items-center gap-1 max-w-full"
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </a>
                      <div className="text-xs text-gray-500 mt-1">
                        {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingLink(link);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Edit link"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete link"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add Link Button */}
      <button
        onClick={() => {
          setEditingLink(null);
          setIsModalOpen(true);
        }}
        disabled={!canAddMore}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-colors ${
          canAddMore
            ? 'border-white/20 text-gray-400 hover:border-red-500/50 hover:text-red-400'
            : 'border-white/10 text-gray-600 cursor-not-allowed opacity-50'
        }`}
      >
        <Plus size={20} />
        <span>{canAddMore ? 'Add Link' : 'Maximum links reached (2/2)'}</span>
      </button>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <AddExternalLinkModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLink(null);
          }}
          onSuccess={() => {
            loadLinks();
            setIsModalOpen(false);
            setEditingLink(null);
          }}
          editingLink={editingLink}
        />
      )}
    </div>
  );
}
