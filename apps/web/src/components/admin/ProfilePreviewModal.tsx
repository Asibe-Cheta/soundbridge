'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export type ProfilePreviewData = {
  name: string;
  username: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  email?: string | null;
};

export function ProfilePreviewModal({
  profile,
  onClose,
}: {
  profile: ProfilePreviewData | null;
  onClose: () => void;
}) {
  if (!profile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gray-600" />
            )}
            <div>
              <div className="font-semibold text-white">{profile.name}</div>
              {profile.username && <div className="text-sm text-gray-400">@{profile.username}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {profile.bio && <p className="mb-2 text-sm text-gray-300">{profile.bio}</p>}
        {profile.email && <p className="mb-4 text-xs text-gray-500">{profile.email}</p>}

        {profile.username ? (
          <a
            href={`/creator/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            View on the main website
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="text-center text-xs text-gray-500">No public profile page for this user.</p>
        )}
      </div>
    </div>
  );
}
